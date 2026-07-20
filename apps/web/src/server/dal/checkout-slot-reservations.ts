import 'server-only'

import { and, asc, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { stripe } from '~/lib/stripe'
import { CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES } from '~/lib/calcom/reservation-policy'
import { db } from '~/server/db'
import { checkoutSlotReservation, payment } from '~/server/db/schema'

const DEFAULT_CLEANUP_BATCH_SIZE = 250
const MAX_CLEANUP_BATCH_SIZE = 1_000
const PROVIDER_STATUS_CONCURRENCY = 5
const INCOMPLETE_ATTEMPT_GRACE_MS = 15 * 60 * 1000
const TERMINAL_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

type CleanupOptions = {
  now?: Date
  batchSize?: number
}

const validateBatchSize = (batchSize: number): void => {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_CLEANUP_BATCH_SIZE) {
    throw new RangeError('Checkout reservation cleanup batch size must be between 1 and 1000')
  }
}

const mapWithConcurrency = async <Input, Output>(
  items: readonly Input[],
  concurrency: number,
  operation: (item: Input) => Promise<Output>
): Promise<Output[]> => {
  const results = new Array<Output>(items.length)
  const entries = items.entries()
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (let next = entries.next(); !next.done; next = entries.next()) {
      const [index, item] = next.value
      results[index] = await operation(item)
    }
  })
  await Promise.all(workers)
  return results
}

const getExpiredActiveCondition = (now: Date) => {
  const incompleteAttemptCutoff = new Date(now.getTime() - INCOMPLETE_ATTEMPT_GRACE_MS)
  const ambiguousAcquisitionCutoff = new Date(
    now.getTime() - CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES * 60 * 1000
  )

  return and(
    isNotNull(checkoutSlotReservation.mentorUserId),
    isNull(checkoutSlotReservation.consumedAt),
    or(
      // A modern attempt is safe to release only after both provider-managed
      // deadlines. If no Stripe Session was created, the expired Cal.com hold
      // alone is authoritative.
      and(
        isNull(checkoutSlotReservation.releasedAt),
        isNotNull(checkoutSlotReservation.reservationUntil),
        lt(checkoutSlotReservation.reservationUntil, now),
        or(
          lt(checkoutSlotReservation.checkoutExpiresAt, now),
          and(
            isNull(checkoutSlotReservation.checkoutExpiresAt),
            isNull(checkoutSlotReservation.stripeCheckoutSessionId)
          )
        )
      ),
      // A crash before the Cal.com reservation was persisted has no provider
      // identifier or Stripe Session to clean up. Keep a grace period longer
      // than the connection-protection window before declaring it abandoned.
      and(
        isNull(checkoutSlotReservation.releasedAt),
        isNull(checkoutSlotReservation.reservationUntil),
        isNull(checkoutSlotReservation.stripeCheckoutSessionId),
        or(
          and(
            isNull(checkoutSlotReservation.reservationAcquisitionStartedAt),
            lt(checkoutSlotReservation.updatedAt, incompleteAttemptCutoff)
          ),
          lt(checkoutSlotReservation.reservationAcquisitionStartedAt, ambiguousAcquisitionCutoff)
        )
      ),
      // Internal generation rollover releases the old hold but deliberately
      // pins the mentor FK while the replacement POST remains ambiguous.
      and(
        isNotNull(checkoutSlotReservation.releasedAt),
        isNotNull(checkoutSlotReservation.reservationAcquisitionStartedAt),
        lt(checkoutSlotReservation.reservationAcquisitionStartedAt, ambiguousAcquisitionCutoff)
      )
    )
  )
}

/**
 * Idempotently release one bounded batch of expired prepayment bridges. The
 * condition is repeated on update so a concurrent retry that establishes a
 * fresh generation cannot lose its mentor-deletion guard.
 */
export const releaseExpiredCheckoutSlotReservations = async ({
  now = new Date(),
  batchSize = DEFAULT_CLEANUP_BATCH_SIZE,
}: CleanupOptions = {}): Promise<number> => {
  validateBatchSize(batchSize)

  const candidates = await db
    .select({
      id: checkoutSlotReservation.bookingAttemptId,
      mentorUserId: checkoutSlotReservation.mentorUserId,
      stripeCheckoutSessionId: checkoutSlotReservation.stripeCheckoutSessionId,
    })
    .from(checkoutSlotReservation)
    .where(getExpiredActiveCondition(now))
    .orderBy(asc(checkoutSlotReservation.updatedAt))
    .limit(batchSize)

  if (candidates.length === 0) return 0

  const candidateSessionIds = candidates.flatMap(candidate =>
    candidate.stripeCheckoutSessionId ? [candidate.stripeCheckoutSessionId] : []
  )
  const boundPayments =
    candidateSessionIds.length === 0
      ? []
      : await db
          .select({
            stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
            mentorUserId: payment.mentorUserId,
          })
          .from(payment)
          .where(inArray(payment.stripeCheckoutSessionId, candidateSessionIds))
  const boundPaymentMentors = new Map(
    boundPayments.map(record => [record.stripeCheckoutSessionId, record.mentorUserId])
  )

  // Local clocks are not authoritative for a hosted Checkout that may have
  // completed just before expiry while its webhook is delayed. Keep the mentor
  // deletion guard unless Stripe proves the unbound Session is terminal, or a
  // matching payment row has already taken over that FK responsibility.
  const safeCandidateIds = (
    await mapWithConcurrency(candidates, PROVIDER_STATUS_CONCURRENCY, async candidate => {
      if (!candidate.stripeCheckoutSessionId) return candidate.id
      if (
        candidate.mentorUserId &&
        boundPaymentMentors.get(candidate.stripeCheckoutSessionId) === candidate.mentorUserId
      ) {
        return candidate.id
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(candidate.stripeCheckoutSessionId)
        return session.status === 'expired' ? candidate.id : null
      } catch {
        // Provider ambiguity must retain the deletion guard for a possibly
        // completed Checkout. A later cleanup run can retry safely.
        return null
      }
    })
  ).filter((id): id is string => id !== null)

  if (safeCandidateIds.length === 0) return 0

  const released = await db
    .update(checkoutSlotReservation)
    .set({ mentorUserId: null, releasedAt: now, updatedAt: now })
    .where(
      and(
        inArray(checkoutSlotReservation.bookingAttemptId, safeCandidateIds),
        getExpiredActiveCondition(now)
      )
    )
    .returning({ id: checkoutSlotReservation.bookingAttemptId })

  return released.length
}

/** Delete only old terminal audit rows, in bounded batches. */
export const purgeTerminalCheckoutSlotReservations = async ({
  now = new Date(),
  batchSize = DEFAULT_CLEANUP_BATCH_SIZE,
}: CleanupOptions = {}): Promise<number> => {
  validateBatchSize(batchSize)
  const cutoff = new Date(now.getTime() - TERMINAL_AUDIT_RETENTION_MS)
  const terminalCondition = and(
    isNull(checkoutSlotReservation.mentorUserId),
    or(
      isNotNull(checkoutSlotReservation.releasedAt),
      isNotNull(checkoutSlotReservation.consumedAt)
    ),
    lt(checkoutSlotReservation.updatedAt, cutoff)
  )

  const candidates = await db
    .select({ id: checkoutSlotReservation.bookingAttemptId })
    .from(checkoutSlotReservation)
    .where(terminalCondition)
    .orderBy(asc(checkoutSlotReservation.updatedAt))
    .limit(batchSize)

  if (candidates.length === 0) return 0

  const deleted = await db
    .delete(checkoutSlotReservation)
    .where(
      and(
        inArray(
          checkoutSlotReservation.bookingAttemptId,
          candidates.map(candidate => candidate.id)
        ),
        terminalCondition
      )
    )
    .returning({ id: checkoutSlotReservation.bookingAttemptId })

  return deleted.length
}
