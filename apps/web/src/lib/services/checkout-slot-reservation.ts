import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES } from '~/lib/calcom/reservation-policy'
import {
  getCalcomReservedSlot,
  reserveCalcomSlot,
  releaseCalcomSlot,
} from '~/lib/calcom/slot-reservations'
import { MINIMUM_PAID_BOOKING_LEAD_MINUTES } from '~/lib/constants'
import { BadRequestError, ExternalApiError } from '~/lib/errors'
import { getSafeErrorName } from '~/lib/operational-logging'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import { checkoutSlotReservation } from '~/server/db/schema'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'

const STRIPE_CHECKOUT_DURATION_MINUTES = 35
const STRIPE_CHECKOUT_MINIMUM_DURATION_MINUTES = 30
const RESERVATION_EXPIRY_MARGIN_MINUTES = 5

type CheckoutSessionSnapshot = {
  id: string
  url: string | null
  status?: 'open' | 'complete' | 'expired' | null
}

type CheckoutRequestSnapshot = Record<string, unknown>

const CheckoutRequestSnapshotSchema = z.record(z.string(), z.json())

const asCheckoutError = (error: unknown, fallbackMessage: string): Error =>
  error instanceof Error ? error : new ExternalApiError(fallbackMessage)

type ReservedCheckoutSessionInput = {
  bookingAttemptId: string
  actorUserId: string
  mentorUserId: string
  eventTypeId: number
  startTime: string
  durationMinutes: number
  retrieveSession: (sessionId: string) => Promise<CheckoutSessionSnapshot>
  expireSession: (sessionId: string) => Promise<CheckoutSessionSnapshot>
  buildCheckoutRequest: (context: {
    reservationUid: string
    reservationUntil: Date
    checkoutExpiresAt: Date
    generation: number
  }) => CheckoutRequestSnapshot
  createSession: (context: {
    checkoutRequest: CheckoutRequestSnapshot
    idempotencyKey: string
    generation: number
  }) => Promise<CheckoutSessionSnapshot>
  isDefinitiveCheckoutExpiryError?: (error: unknown) => boolean
}

export const getCheckoutAttemptLockKey = (bookingAttemptId: string): string =>
  `discuno:checkout-attempt:${bookingAttemptId}`

const releaseProviderReservationBestEffort = async (
  reservationUid: string,
  mentorUserId: string
): Promise<void> => {
  try {
    await releaseCalcomSlot(reservationUid, mentorUserId)
  } catch (error) {
    // Holds expire at Cal.com even when explicit cleanup is temporarily down.
    console.warn('Cal.com slot reservation cleanup was deferred to expiry', {
      errorName: getSafeErrorName(error),
    })
  }
}

const markReservationReleased = async (
  bookingAttemptId: string,
  reservationUid: string,
  options: { consumed?: boolean; preserveMentorGuard?: boolean } = {}
): Promise<void> => {
  const now = new Date()
  await db
    .update(checkoutSlotReservation)
    .set({
      ...(options.preserveMentorGuard ? {} : { mentorUserId: null }),
      releasedAt: now,
      ...(options.consumed ? { consumedAt: now } : {}),
      updatedAt: now,
    })
    .where(
      and(
        eq(checkoutSlotReservation.bookingAttemptId, bookingAttemptId),
        eq(checkoutSlotReservation.calcomReservationUid, reservationUid)
      )
    )
}

const releaseCheckoutSlotReservationStrict = async ({
  bookingAttemptId,
  reservationUid,
  mentorUserId,
  preserveMentorGuard = false,
}: {
  bookingAttemptId: string
  reservationUid: string
  mentorUserId: string
  preserveMentorGuard?: boolean
}): Promise<void> => {
  await releaseCalcomSlot(reservationUid, mentorUserId)
  await markReservationReleased(bookingAttemptId, reservationUid, { preserveMentorGuard })
}

const isDefinitiveCalcomReservationRejection = (error: unknown): boolean =>
  error instanceof ExternalApiError &&
  typeof error.providerStatus === 'number' &&
  error.providerStatus >= 400 &&
  error.providerStatus < 500 &&
  error.providerStatus !== 408

export const releaseCheckoutSlotReservation = async ({
  bookingAttemptId,
  reservationUid,
  mentorUserId,
  consumed = false,
}: {
  bookingAttemptId: string
  reservationUid: string
  mentorUserId: string
  consumed?: boolean
}): Promise<void> => {
  await releaseProviderReservationBestEffort(reservationUid, mentorUserId)
  await markReservationReleased(bookingAttemptId, reservationUid, { consumed })
}

const CheckoutReservationMetadataSchema = z.object({
  bookingAttemptId: z.uuid(),
  calcomReservationUid: z.uuid(),
  mentorUserId: z.uuid(),
  checkoutReservationGeneration: z.string().regex(/^\d+$/).optional(),
})

export const releaseCheckoutSlotReservationFromMetadata = async (
  metadata: unknown,
  options: { consumed?: boolean } = {}
): Promise<boolean> => {
  const parsed = CheckoutReservationMetadataSchema.safeParse(metadata)
  if (!parsed.success) return false
  await releaseCheckoutSlotReservation({
    bookingAttemptId: parsed.data.bookingAttemptId,
    reservationUid: parsed.data.calcomReservationUid,
    mentorUserId: parsed.data.mentorUserId,
    consumed: options.consumed,
  })
  return true
}

type FulfillmentReservationInput = {
  bookingAttemptId: string
  reservationUid: string
  reservationUntil: string
  generation: number
  stripeCheckoutSessionId: string
  mentorUserId: string
  eventTypeId: number
  startTime: string
  durationMinutes: number
}

type ValidatedReservationResult<T> = { valid: false; reason: string } | { valid: true; value: T }

/**
 * Keep the attempt lock through final Cal.com creation so cancel/expiry cannot
 * release the provider hold between attestation and the external POST.
 */
export const withValidatedCheckoutSlotReservation = async <T>(
  input: FulfillmentReservationInput,
  operation: () => Promise<T>
): Promise<ValidatedReservationResult<T>> =>
  withDatabaseAdvisoryLock(getCheckoutAttemptLockKey(input.bookingAttemptId), async () => {
    const record = await db.query.checkoutSlotReservation.findFirst({
      where: eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
    })
    const expectedStart = new Date(input.startTime)
    const expectedReservationUntil = new Date(input.reservationUntil)
    const locallyBound = Boolean(
      record &&
      record.mentorUserId === input.mentorUserId &&
      record.calcomEventTypeId === input.eventTypeId &&
      record.startTime.getTime() === expectedStart.getTime() &&
      record.durationMinutes === input.durationMinutes &&
      record.calcomReservationUid === input.reservationUid &&
      record.reservationUntil?.getTime() === expectedReservationUntil.getTime() &&
      record.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
      record.generation === input.generation &&
      !record.releasedAt &&
      !record.consumedAt &&
      record.reservationUntil > new Date()
    )
    if (!locallyBound) return { valid: false, reason: 'local_reservation_mismatch' }

    const providerReservation = await getCalcomReservedSlot(
      input.reservationUid,
      input.mentorUserId
    )
    if (!providerReservation) return { valid: false, reason: 'provider_reservation_missing' }

    const providerStart = new Date(providerReservation.slotStart)
    const providerEnd = new Date(providerReservation.slotEnd)
    const providerUntil = new Date(providerReservation.reservationUntil)
    const providerBound =
      providerReservation.reservationUid === input.reservationUid &&
      providerReservation.eventTypeId === input.eventTypeId &&
      providerStart.getTime() === expectedStart.getTime() &&
      providerReservation.slotDuration === input.durationMinutes &&
      providerEnd.getTime() - providerStart.getTime() === input.durationMinutes * 60 * 1000 &&
      providerUntil.getTime() === expectedReservationUntil.getTime() &&
      providerUntil > new Date()
    if (!providerBound) return { valid: false, reason: 'provider_reservation_mismatch' }

    return { valid: true, value: await operation() }
  })

/**
 * Serialize one client attempt across Cal.com and Stripe. The durable row
 * closes retry/crash windows: an existing hold is reused, and Stripe's own
 * idempotency key can safely replay the callback for the same generation.
 */
export const createCheckoutWithReservedSlot = async (
  input: ReservedCheckoutSessionInput
): Promise<CheckoutSessionSnapshot> =>
  withDatabaseAdvisoryLock(getCheckoutAttemptLockKey(input.bookingAttemptId), () =>
    withDatabaseAdvisoryLock(`discuno:calcom-connection:${input.mentorUserId}`, async () => {
      const requestedStart = new Date(input.startTime)
      if (requestedStart.getTime() < Date.now() + MINIMUM_PAID_BOOKING_LEAD_MINUTES * 60 * 1000) {
        throw new BadRequestError('Paid sessions must start at least 45 minutes from now')
      }
      const canonicalActorUserId =
        (await resolveCanonicalUserId(input.actorUserId)) ?? input.actorUserId

      await db
        .insert(checkoutSlotReservation)
        .values({
          bookingAttemptId: input.bookingAttemptId,
          actorUserId: canonicalActorUserId,
          mentorUserId: input.mentorUserId,
          calcomEventTypeId: input.eventTypeId,
          startTime: requestedStart,
          durationMinutes: input.durationMinutes,
        })
        .onConflictDoNothing({ target: checkoutSlotReservation.bookingAttemptId })

      const storedRecord = await db.query.checkoutSlotReservation.findFirst({
        where: eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
      })
      if (!storedRecord) {
        throw new ExternalApiError('Checkout reservation state could not be persisted')
      }
      let record = storedRecord

      const storedCanonicalActorUserId =
        (await resolveCanonicalUserId(record.actorUserId)) ?? record.actorUserId
      if (
        storedCanonicalActorUserId !== canonicalActorUserId ||
        record.mentorUserId !== input.mentorUserId ||
        record.calcomEventTypeId !== input.eventTypeId ||
        record.startTime.getTime() !== requestedStart.getTime() ||
        record.durationMinutes !== input.durationMinutes
      ) {
        throw new BadRequestError('This checkout attempt does not match the selected session')
      }

      const attestProviderReservation = async (
        reservationUid: string,
        reservationUntil: Date
      ): Promise<void> => {
        const providerReservation = await getCalcomReservedSlot(reservationUid, input.mentorUserId)
        if (!providerReservation) {
          await markReservationReleased(input.bookingAttemptId, reservationUid)
          throw new ExternalApiError('Cal.com slot reservation is no longer active')
        }
        const providerStart = new Date(providerReservation.slotStart)
        const providerEnd = new Date(providerReservation.slotEnd)
        const providerUntil = new Date(providerReservation.reservationUntil)
        const providerReservationMatches =
          providerReservation.reservationUid === reservationUid &&
          providerReservation.eventTypeId === input.eventTypeId &&
          providerStart.getTime() === requestedStart.getTime() &&
          providerReservation.slotDuration === input.durationMinutes &&
          providerEnd.getTime() - providerStart.getTime() === input.durationMinutes * 60 * 1000 &&
          providerUntil.getTime() === reservationUntil.getTime() &&
          providerUntil > new Date()
        if (!providerReservationMatches) {
          await releaseCheckoutSlotReservationStrict({
            bookingAttemptId: input.bookingAttemptId,
            reservationUid,
            mentorUserId: input.mentorUserId,
          })
          throw new ExternalApiError('Cal.com slot reservation no longer matches Checkout')
        }
      }

      const now = new Date()
      if (record.stripeCheckoutSessionId) {
        const existingSession = await input.retrieveSession(record.stripeCheckoutSessionId)
        if (existingSession.status === 'complete') {
          throw new BadRequestError('This checkout has already been completed')
        }
        if (existingSession.status === 'open' || existingSession.status == null) {
          if (
            record.calcomReservationUid &&
            record.reservationUntil &&
            record.checkoutExpiresAt &&
            !record.releasedAt &&
            !record.consumedAt &&
            record.reservationUntil > now &&
            record.checkoutExpiresAt > now &&
            existingSession.url
          ) {
            await attestProviderReservation(record.calcomReservationUid, record.reservationUntil)
            return existingSession
          }
          await input.expireSession(existingSession.id)
        }

        if (record.calcomReservationUid && !record.releasedAt && !record.consumedAt) {
          await releaseCheckoutSlotReservationStrict({
            bookingAttemptId: input.bookingAttemptId,
            reservationUid: record.calcomReservationUid,
            mentorUserId: input.mentorUserId,
            preserveMentorGuard: true,
          })
          record = { ...record, mentorUserId: input.mentorUserId, releasedAt: new Date() }
        }
      }

      let reservationUid = record.calcomReservationUid
      let reservationUntil = record.reservationUntil
      let checkoutExpiresAt = record.checkoutExpiresAt
      let checkoutRequest = record.checkoutRequestSnapshot
      let generation = record.generation

      const clearReservationAcquisitionMarker = async (): Promise<void> => {
        await db
          .update(checkoutSlotReservation)
          .set({ reservationAcquisitionStartedAt: null, updatedAt: new Date() })
          .where(eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId))
      }

      const acquireFreshReservation = async (): Promise<void> => {
        const marker = record.reservationAcquisitionStartedAt
        if (
          (!record.calcomReservationUid ||
            Boolean(record.releasedAt) ||
            Boolean(record.consumedAt)) &&
          marker &&
          marker.getTime() + CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES * 60 * 1000 >
            Date.now()
        ) {
          throw new ExternalApiError(
            'Cal.com slot reservation status is still being reconciled; please retry later'
          )
        }

        if (reservationUid && !record.releasedAt && !record.consumedAt) {
          await releaseCheckoutSlotReservationStrict({
            bookingAttemptId: input.bookingAttemptId,
            reservationUid,
            mentorUserId: input.mentorUserId,
            preserveMentorGuard: true,
          })
          record = { ...record, mentorUserId: input.mentorUserId, releasedAt: new Date() }
        }

        if (record.calcomReservationUid) generation += 1
        const acquisitionStartedAt = new Date()
        let providerReservation: Awaited<ReturnType<typeof reserveCalcomSlot>>
        try {
          providerReservation = await reserveCalcomSlot({
            eventTypeId: input.eventTypeId,
            slotStart: requestedStart.toISOString(),
            mentorUserId: input.mentorUserId,
            onBeforeReserveAttempt: async () => {
              const markedRecords = await db
                .update(checkoutSlotReservation)
                .set({
                  reservationAcquisitionStartedAt: acquisitionStartedAt,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
                    eq(checkoutSlotReservation.mentorUserId, input.mentorUserId),
                    eq(checkoutSlotReservation.generation, record.generation),
                    record.calcomReservationUid
                      ? eq(
                          checkoutSlotReservation.calcomReservationUid,
                          record.calcomReservationUid
                        )
                      : isNull(checkoutSlotReservation.calcomReservationUid)
                  )
                )
                .returning({
                  bookingAttemptId: checkoutSlotReservation.bookingAttemptId,
                  mentorUserId: checkoutSlotReservation.mentorUserId,
                  generation: checkoutSlotReservation.generation,
                  calcomReservationUid: checkoutSlotReservation.calcomReservationUid,
                  reservationAcquisitionStartedAt:
                    checkoutSlotReservation.reservationAcquisitionStartedAt,
                })
              const [markedRecord] = markedRecords
              if (
                !markedRecord ||
                markedRecord.bookingAttemptId !== input.bookingAttemptId ||
                markedRecord.mentorUserId !== input.mentorUserId ||
                markedRecord.reservationAcquisitionStartedAt?.getTime() !==
                  acquisitionStartedAt.getTime() ||
                markedRecord.calcomReservationUid !== record.calcomReservationUid ||
                markedRecord.generation !== record.generation
              ) {
                throw new ExternalApiError(
                  'Cal.com slot reservation attempt marker could not be persisted'
                )
              }
              record = { ...record, reservationAcquisitionStartedAt: acquisitionStartedAt }
            },
          })
        } catch (error) {
          if (isDefinitiveCalcomReservationRejection(error)) {
            try {
              await clearReservationAcquisitionMarker()
              record = { ...record, reservationAcquisitionStartedAt: null }
            } catch (cleanupError) {
              console.warn('Cal.com reservation rejection marker cleanup was deferred', {
                errorName: getSafeErrorName(cleanupError),
              })
            }
          }
          throw error
        }

        const providerStart = new Date(providerReservation.slotStart)
        const providerEnd = new Date(providerReservation.slotEnd)
        const providerUntil = new Date(providerReservation.reservationUntil)
        const newCheckoutExpiresAt = new Date(
          Date.now() + STRIPE_CHECKOUT_DURATION_MINUTES * 60 * 1000
        )
        const requiredReservationUntil = new Date(
          newCheckoutExpiresAt.getTime() + RESERVATION_EXPIRY_MARGIN_MINUTES * 60 * 1000
        )
        const matchesRequestedSlot =
          providerReservation.eventTypeId === input.eventTypeId &&
          providerStart.getTime() === requestedStart.getTime() &&
          providerReservation.slotDuration === input.durationMinutes &&
          providerEnd.getTime() - providerStart.getTime() === input.durationMinutes * 60 * 1000 &&
          providerUntil >= requiredReservationUntil

        if (!matchesRequestedSlot) {
          await releaseCalcomSlot(providerReservation.reservationUid, input.mentorUserId)
          await clearReservationAcquisitionMarker()
          throw new ExternalApiError('Cal.com reserved an unexpected session slot')
        }

        const nextReservationUid = providerReservation.reservationUid
        let checkoutRequestCandidate: CheckoutRequestSnapshot
        try {
          checkoutRequestCandidate = input.buildCheckoutRequest({
            reservationUid: nextReservationUid,
            reservationUntil: providerUntil,
            checkoutExpiresAt: newCheckoutExpiresAt,
            generation,
          })
        } catch (error) {
          await releaseCalcomSlot(nextReservationUid, input.mentorUserId)
          await clearReservationAcquisitionMarker()
          throw asCheckoutError(error, 'Checkout request construction failed')
        }
        const parsedCheckoutRequest =
          CheckoutRequestSnapshotSchema.safeParse(checkoutRequestCandidate)
        if (!parsedCheckoutRequest.success) {
          await releaseCalcomSlot(nextReservationUid, input.mentorUserId)
          await clearReservationAcquisitionMarker()
          throw new ExternalApiError('Checkout request snapshot is not JSON-safe')
        }

        const nextCheckoutRequest = parsedCheckoutRequest.data
        const persistReservationState = async (): Promise<void> => {
          await db
            .update(checkoutSlotReservation)
            .set({
              mentorUserId: input.mentorUserId,
              calcomReservationUid: nextReservationUid,
              reservationUntil: providerUntil,
              reservationAcquisitionStartedAt: null,
              checkoutExpiresAt: newCheckoutExpiresAt,
              checkoutRequestSnapshot: nextCheckoutRequest,
              stripeCheckoutSessionId: null,
              generation,
              releasedAt: null,
              consumedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId))
        }
        const reservationStateWasPersisted = (
          candidate: Awaited<ReturnType<typeof db.query.checkoutSlotReservation.findFirst>>
        ): boolean =>
          Boolean(
            candidate &&
            candidate.mentorUserId === input.mentorUserId &&
            candidate.calcomReservationUid === nextReservationUid &&
            candidate.reservationUntil?.getTime() === providerUntil.getTime() &&
            candidate.checkoutExpiresAt?.getTime() === newCheckoutExpiresAt.getTime() &&
            candidate.generation === generation &&
            !candidate.releasedAt &&
            !candidate.consumedAt
          )

        let initialWriteError: unknown
        try {
          await persistReservationState()
        } catch (error) {
          initialWriteError = error
        }

        let persistedState
        try {
          persistedState = await db.query.checkoutSlotReservation.findFirst({
            where: eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
          })
        } catch (readError) {
          // The acquisition marker or exact provider UID remains durable. A
          // later retry will reconcile state and cannot safely reach Stripe.
          throw asCheckoutError(
            initialWriteError ?? readError,
            'Cal.com slot reservation binding could not be verified'
          )
        }

        if (!reservationStateWasPersisted(persistedState)) {
          let retryWriteError: unknown
          try {
            await persistReservationState()
          } catch (error) {
            retryWriteError = error
          }
          try {
            persistedState = await db.query.checkoutSlotReservation.findFirst({
              where: eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
            })
          } catch (readError) {
            throw asCheckoutError(
              retryWriteError ?? readError,
              'Cal.com slot reservation binding could not be verified'
            )
          }
          if (!reservationStateWasPersisted(persistedState)) {
            await releaseCalcomSlot(nextReservationUid, input.mentorUserId)
            await clearReservationAcquisitionMarker()
            throw asCheckoutError(
              initialWriteError ?? retryWriteError,
              'Cal.com slot reservation state could not be bound locally'
            )
          }
        }

        reservationUid = nextReservationUid
        reservationUntil = providerUntil
        checkoutExpiresAt = newCheckoutExpiresAt
        checkoutRequest = nextCheckoutRequest
        record = {
          ...record,
          mentorUserId: input.mentorUserId,
          calcomReservationUid: reservationUid,
          reservationUntil,
          reservationAcquisitionStartedAt: null,
          checkoutExpiresAt,
          checkoutRequestSnapshot: checkoutRequest,
          stripeCheckoutSessionId: null,
          generation,
          releasedAt: null,
          consumedAt: null,
        }
      }

      const canReuseReservation = Boolean(
        reservationUid &&
        reservationUntil &&
        checkoutExpiresAt &&
        checkoutRequest &&
        !record.releasedAt &&
        !record.consumedAt &&
        checkoutExpiresAt > now &&
        reservationUntil.getTime() >=
          checkoutExpiresAt.getTime() + RESERVATION_EXPIRY_MARGIN_MINUTES * 60 * 1000
      )
      if (!canReuseReservation) await acquireFreshReservation()

      let expiryRolloverAvailable = true
      for (;;) {
        if (!reservationUid || !reservationUntil || !checkoutExpiresAt || !checkoutRequest) {
          throw new ExternalApiError('Checkout slot reservation is incomplete')
        }

        const reservationCoversCheckout =
          reservationUntil.getTime() >=
          checkoutExpiresAt.getTime() + RESERVATION_EXPIRY_MARGIN_MINUTES * 60 * 1000
        if (!reservationCoversCheckout) {
          await releaseCheckoutSlotReservation({
            bookingAttemptId: input.bookingAttemptId,
            reservationUid,
            mentorUserId: input.mentorUserId,
          })
          throw new ExternalApiError('Cal.com slot reservation expired before Checkout was ready')
        }

        await attestProviderReservation(reservationUid, reservationUntil)

        let session: CheckoutSessionSnapshot
        try {
          session = await input.createSession({
            checkoutRequest,
            idempotencyKey: `discuno:checkout:v4:${input.bookingAttemptId}:${generation}`,
            generation,
          })
        } catch (error) {
          const snapshotIsNowTooCloseToExpiry =
            checkoutExpiresAt.getTime() - Date.now() <
            STRIPE_CHECKOUT_MINIMUM_DURATION_MINUTES * 60 * 1000
          if (
            !expiryRolloverAvailable ||
            !snapshotIsNowTooCloseToExpiry ||
            !input.isDefinitiveCheckoutExpiryError?.(error)
          ) {
            throw error
          }

          // Stripe's parameter-validation error proves this idempotency key
          // never began execution, so no Checkout can exist for generation N.
          await releaseCheckoutSlotReservationStrict({
            bookingAttemptId: input.bookingAttemptId,
            reservationUid,
            mentorUserId: input.mentorUserId,
            preserveMentorGuard: true,
          })
          record = { ...record, mentorUserId: input.mentorUserId, releasedAt: new Date() }
          expiryRolloverAvailable = false
          await acquireFreshReservation()
          continue
        }
        if (!session.url) throw new ExternalApiError('Failed to create checkout session URL')

        await db
          .update(checkoutSlotReservation)
          .set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
          .where(
            and(
              eq(checkoutSlotReservation.bookingAttemptId, input.bookingAttemptId),
              eq(checkoutSlotReservation.calcomReservationUid, reservationUid)
            )
          )

        return session
      }
    })
  )
