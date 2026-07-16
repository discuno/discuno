import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from 'drizzle-orm'
import { NonRetriableError } from 'inngest'
import { z } from 'zod'
import { inngest } from './client'
import { processCalcomWebhookEvent } from '~/app/api/webhooks/cal/route'
import {
  createCalcomBooking,
  findCalcomBookingByPaymentId,
  getCalcomBooking,
  type CalcomBookingIdentity,
} from '~/lib/calcom'
import { CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT } from '~/lib/calcom/booking-audit'
import { paidCalcomBookingMatchesCheckout } from '~/lib/calcom/paid-booking-attestation'
import { deleteCalcomWebhookWithAccessToken, ensureCalcomWebhook } from '~/lib/calcom/webhooks'
import { CalcomOAuthTokenError, refreshCalcomOAuthTokens } from '~/lib/calcom/oauth'
import { decryptCalcomToken, encryptCalcomToken } from '~/lib/calcom/token-crypto'
import {
  sendAdminAlert,
  sendBookingFailureEmail,
  sendOperationalAlert,
} from '~/lib/emails/booking-notifications'
import { getSafeErrorName } from '~/lib/operational-logging'
import { trackServerEvent } from '~/lib/posthog-server'
import { createLocalBooking } from '~/lib/services/booking-service'
import {
  releaseCheckoutSlotReservationFromMetadata,
  withValidatedCheckoutSlotReservation,
} from '~/lib/services/checkout-slot-reservation'
import { settleCheckoutReservationLoss } from '~/lib/services/checkout-reservation-loss'
import {
  cancelFutureBookingAfterPaymentHold,
  refundPayment,
  reconcileStripeStateBeforeFulfillment,
  scheduleMentorPayout,
  transferMentorPayment,
  updatePaymentPayoutEligibility,
  withPaymentOperationLock,
} from '~/lib/services/payment-service'
import { stripe } from '~/lib/stripe'
import { processStripeConnectWebhookEvent, processStripeWebhookEvent } from '~/lib/stripe/webhook'
import { db } from '~/server/db'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'
import {
  booking,
  calcomToken,
  calcomWebhookCleanup,
  calcomWebhookInbox,
  mentorEventType,
  payment,
  stripeWebhookInbox,
  user,
} from '~/server/db/schema'
import { syncMentorEventTypesForUser } from '~/server/auth/dal'

const MAX_WEBHOOK_PROCESSING_ATTEMPTS = 25

/**
 * Event types for Inngest functions
 */
export type ProcessCheckoutSideEffectsEvent = {
  name: 'stripe/checkout.completed'
  data: {
    paymentId: number
  }
}

const checkoutMetadataSchema = z.object({
  mentorUserId: z.uuid(),
  eventTypeId: z.string().regex(/^\d+$/),
  startTime: z.iso.datetime(),
  attendeeName: z.string().trim().min(1).max(100),
  attendeeEmail: z.email().max(255),
  attendeePhone: z.string().max(50).optional(),
  attendeeTopic: z.string().trim().min(3).max(200).optional(),
  attendeeTimeZone: z.string().trim().min(1).max(100),
  mentorUsername: z.string().trim().min(1).max(255),
  mentorFee: z.string().regex(/^\d+$/),
  menteeFee: z.string().regex(/^\d+$/),
  mentorAmount: z.string().regex(/^\d+$/),
  mentorStripeAccountId: z.string().startsWith('acct_').max(255),
  actorUserId: z.uuid(),
  eventDurationMinutes: z.string().regex(/^\d+$/),
  payoutEligibleAt: z.iso.datetime(),
  transferGroup: z.string().startsWith('discuno_booking_').max(255),
  // Optional only for rollout compatibility with Checkout Sessions created
  // before client-generated attempt IDs were introduced.
  bookingAttemptId: z.uuid().optional(),
  calcomReservationUid: z.uuid().optional(),
  calcomReservationUntil: z.iso.datetime().optional(),
  checkoutReservationGeneration: z.string().regex(/^\d+$/).optional(),
})

const storedCheckoutMetadataSchema = z.object({
  checkoutSessionMetadata: checkoutMetadataSchema,
  calcomBookingCreateAttemptedAt: z.iso.datetime().optional(),
})

const loadCheckoutFulfillmentContext = async (paymentId: number) => {
  const [record] = await db.select().from(payment).where(eq(payment.id, paymentId)).limit(1)
  if (!record) throw new NonRetriableError(`Payment ${paymentId} does not exist`)

  const parsedMetadata = storedCheckoutMetadataSchema.safeParse(record.metadata)
  if (!parsedMetadata.success) {
    throw new NonRetriableError(`Payment ${paymentId} has invalid checkout metadata`)
  }

  return {
    paymentId: record.id,
    paymentIntentId: record.stripePaymentIntentId,
    sessionId: record.stripeCheckoutSessionId,
    sessionAmount: record.amount,
    sessionCurrency: record.currency,
    platformStatus: record.platformStatus,
    disputeRequested: record.disputeRequested,
    requiresManualReview: record.requiresManualReview,
    refundStatus: record.refundStatus,
    refundedAmount: record.refundedAmount,
    calcomBookingUid: record.calcomBookingUid,
    calcomBookingCreateAttemptedAt: parsedMetadata.data.calcomBookingCreateAttemptedAt ?? null,
    metadata: parsedMetadata.data.checkoutSessionMetadata,
  }
}

const isCheckoutPaymentFulfillable = (
  context: Awaited<ReturnType<typeof loadCheckoutFulfillmentContext>>
): boolean =>
  context.platformStatus === 'SUCCEEDED' &&
  !context.disputeRequested &&
  !context.requiresManualReview &&
  !context.refundStatus &&
  !context.refundedAmount

type CheckoutFulfillmentContext = Awaited<ReturnType<typeof loadCheckoutFulfillmentContext>>

const verifyPaidProviderBooking = async ({
  context,
  bookingUid,
  localBooking,
}: {
  context: CheckoutFulfillmentContext
  bookingUid: string
  localBooking?: { calcomBookingId: number; startTime: Date; endTime: Date }
}) => {
  const providerBooking = await getCalcomBooking(bookingUid, context.metadata.mentorUserId)
  const providerRescheduledFromUid = providerBooking.rescheduledFromUid?.trim()
  const rescheduledFromUid = providerRescheduledFromUid?.length ? providerRescheduledFromUid : null
  if (rescheduledFromUid) {
    const [predecessor] = await db
      .select({ id: booking.id })
      .from(booking)
      .where(
        and(
          eq(booking.paymentId, context.paymentId),
          eq(booking.calcomUid, rescheduledFromUid),
          eq(booking.status, 'CANCELLED')
        )
      )
      .limit(1)
    if (!predecessor) throw new Error('Cal.com reschedule lineage is not recognized locally')
  }

  const providerEnd = new Date(providerBooking.end)
  const matchesCheckout = paidCalcomBookingMatchesCheckout({
    booking: providerBooking,
    checkout: context.metadata,
    paymentId: context.paymentId,
    expectedUid: bookingUid,
    expectedBookingId: localBooking?.calcomBookingId,
    expectedCurrentStart: localBooking?.startTime,
    rescheduledFromUid,
  })
  if (
    !matchesCheckout ||
    providerBooking.status.toLowerCase() !== 'accepted' ||
    (localBooking && providerEnd.getTime() !== localBooking.endTime.getTime())
  ) {
    throw new Error('Cal.com booking does not match the paid Checkout')
  }

  return providerBooking
}

const persistCheckoutBookingSnapshot = async ({
  context,
  calcomBooking,
}: {
  context: CheckoutFulfillmentContext
  calcomBooking: CalcomBookingIdentity
}) => {
  const [mentor] = await db
    .select({
      name: user.name,
      email: user.email,
      calcomUsername: calcomToken.calcomUsername,
      eventTitle: mentorEventType.title,
      eventDescription: mentorEventType.description,
    })
    .from(user)
    .innerJoin(calcomToken, eq(calcomToken.userId, user.id))
    .innerJoin(
      mentorEventType,
      and(
        eq(mentorEventType.mentorUserId, user.id),
        eq(mentorEventType.calcomEventTypeId, Number(context.metadata.eventTypeId))
      )
    )
    .where(eq(user.id, context.metadata.mentorUserId))
    .limit(1)
  if (!mentor) throw new Error('Mentor booking snapshot context is missing')

  const expectedStart = new Date(context.metadata.startTime)
  const eventDuration = Number(context.metadata.eventDurationMinutes)
  if (!Number.isSafeInteger(eventDuration) || eventDuration <= 0) {
    throw new Error('Checkout booking duration is invalid')
  }
  const providerStart = new Date(calcomBooking.start)
  const providerEnd = new Date(calcomBooking.end)
  if (
    (!calcomBooking.rescheduledFromUid && providerStart.getTime() !== expectedStart.getTime()) ||
    calcomBooking.duration !== eventDuration ||
    providerEnd.getTime() - providerStart.getTime() !== eventDuration * 60 * 1000
  ) {
    throw new Error('Cal.com booking schedule conflicts with the paid Checkout snapshot')
  }
  const canonicalAttendeeUserId = await resolveCanonicalUserId(context.metadata.actorUserId)
  const { booking: storedBooking, created } = await createLocalBooking({
    calcomBookingId: calcomBooking.id,
    calcomUid: calcomBooking.uid,
    title: mentor.eventTitle,
    description: mentor.eventDescription,
    startTime: providerStart,
    duration: eventDuration,
    endTime: providerEnd,
    meetingUrl: calcomBooking.meetingUrl ?? undefined,
    calcomEventTypeId: Number(context.metadata.eventTypeId),
    paymentId: context.paymentId,
    rescheduledFromUid: calcomBooking.rescheduledFromUid ?? undefined,
    organizer: {
      userId: context.metadata.mentorUserId,
      name: mentor.name,
      email: mentor.email,
      username: mentor.calcomUsername,
    },
    attendee: {
      userId: canonicalAttendeeUserId,
      name: context.metadata.attendeeName,
      email: context.metadata.attendeeEmail,
      phoneNumber: context.metadata.attendeePhone,
      timeZone: context.metadata.attendeeTimeZone,
    },
    webhookPayload: CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT,
    status: 'ACCEPTED',
  })

  const payoutEligibleAt = await updatePaymentPayoutEligibility(
    context.paymentId,
    providerStart,
    eventDuration
  )
  await scheduleMentorPayout({
    paymentId: context.paymentId,
    calcomBookingUid: calcomBooking.uid,
    payoutEligibleAt,
    reason: created ? 'checkout-booking-reconciled' : 'checkout-booking-already-stored',
  })
  return { storedBookingId: storedBooking.id, created }
}

type TerminalCheckoutSettlement =
  | Awaited<ReturnType<typeof settleCheckoutReservationLoss>>
  | { status: 'booking_recovered_payment_held'; bookingUid: string; reason: string }

/**
 * A prior Cal.com create can cross the provider boundary before any later
 * local/configuration/payment gate runs. Reconcile that provider state first,
 * then either preserve the verified booking, cancel it behind a payment hold,
 * or refund only after Cal.com authoritatively reports no match.
 */
const settleTerminalCheckout = async ({
  paymentId,
  refundIfNoBooking,
  refundPurpose,
  paymentHoldCancellationReason,
}: {
  paymentId: number
  refundIfNoBooking: boolean
  refundPurpose: string
  paymentHoldCancellationReason: string
}): Promise<TerminalCheckoutSettlement> =>
  withPaymentOperationLock(paymentId, async () => {
    const currentContext = await loadCheckoutFulfillmentContext(paymentId)
    const [localBooking] = await db
      .select({
        calcomBookingId: booking.calcomBookingId,
        calcomUid: booking.calcomUid,
        startTime: booking.startTime,
        endTime: booking.endTime,
      })
      .from(booking)
      .where(
        and(
          eq(booking.paymentId, paymentId),
          currentContext.calcomBookingUid
            ? eq(booking.calcomUid, currentContext.calcomBookingUid)
            : or(ne(booking.status, 'CANCELLED'), eq(booking.mentorPayoutEligible, true))
        )
      )
      .limit(1)
    const settlement = await settleCheckoutReservationLoss({
      knownBookingUid: currentContext.calcomBookingUid ?? localBooking?.calcomUid ?? null,
      providerMutationMayBeInFlight: currentContext.calcomBookingCreateAttemptedAt !== null,
      findProviderBooking: () =>
        findCalcomBookingByPaymentId({
          paymentId,
          attendeeEmail: currentContext.metadata.attendeeEmail,
          eventTypeId: Number(currentContext.metadata.eventTypeId),
          mentorUserId: currentContext.metadata.mentorUserId,
        }),
      verifyAndPersistProviderBooking: async bookingUid => {
        const verifiedBooking = await verifyPaidProviderBooking({
          context: currentContext,
          bookingUid,
          ...(localBooking?.calcomUid === bookingUid ? { localBooking } : {}),
        })
        await persistCheckoutBookingSnapshot({
          context: currentContext,
          calcomBooking: verifiedBooking,
        })
        return verifiedBooking.uid
      },
      canRefund: async () => {
        if (!refundIfNoBooking || !isCheckoutPaymentFulfillable(currentContext)) return false
        const providerGate = await reconcileStripeStateBeforeFulfillment(paymentId)
        return providerGate.fulfillable
      },
      refund: () => refundPayment(paymentId, refundPurpose),
    })

    if (settlement.status !== 'booking_recovered') return settlement

    const providerGate = await reconcileStripeStateBeforeFulfillment(paymentId)
    const refreshedContext = await loadCheckoutFulfillmentContext(paymentId)
    if (!providerGate.fulfillable || !isCheckoutPaymentFulfillable(refreshedContext)) {
      await cancelFutureBookingAfterPaymentHold(paymentId, paymentHoldCancellationReason)
      return {
        status: 'booking_recovered_payment_held',
        bookingUid: settlement.bookingUid,
        reason: providerGate.reason ?? 'payment_held',
      }
    }

    return settlement
  })

export type ProcessMentorPayoutEvent = {
  name: 'payment/mentor-payout.scheduled'
  data: {
    paymentId: number
    calcomBookingUid: string
    payoutEligibleAt: string
  }
}

export type ProcessStripeWebhookEvent = {
  name: 'stripe/webhook.received'
  data: { inboxId: number }
}

export type ProcessStripeConnectWebhookEvent = {
  name: 'stripe/connect-webhook.received'
  data: { inboxId: number }
}

export type ProcessCalcomWebhookEvent = {
  name: 'calcom/webhook.received'
  data: { inboxId: number }
}

export type CalcomConnectionSyncRequestedEvent = {
  name: 'discuno/calcom.connection-sync.requested'
  data: { userId: string }
}

export type CalcomWebhookCleanupRequestedEvent = {
  name: 'discuno/calcom.webhook-cleanup.requested'
  data: { cleanupId: number }
}

/** Complete OAuth follow-up work durably when Cal.com is transiently unavailable. */
export const syncCalcomConnection = inngest.createFunction(
  {
    id: 'sync-calcom-connection',
    name: 'Sync Cal.com Connection',
    triggers: { event: 'discuno/calcom.connection-sync.requested' },
    retries: 8,
  },
  async ({ event, step }) => {
    const { userId } = event.data as CalcomConnectionSyncRequestedEvent['data']
    await step.run('wait-for-prior-account-webhook-cleanup', async () => {
      const connection = await db.query.calcomToken.findFirst({
        where: eq(calcomToken.userId, userId),
        columns: { calcomUserId: true },
      })
      if (!connection) throw new NonRetriableError('Cal.com connection no longer exists')

      const pendingCleanup = await db.query.calcomWebhookCleanup.findFirst({
        where: and(
          eq(calcomWebhookCleanup.userId, userId),
          eq(calcomWebhookCleanup.calcomUserId, connection.calcomUserId),
          isNull(calcomWebhookCleanup.processedAt),
          isNull(calcomWebhookCleanup.quarantinedAt)
        ),
        columns: { id: true },
      })
      if (pendingCleanup) {
        throw new Error(`Cal.com webhook cleanup ${pendingCleanup.id} is still processing`)
      }
    })
    const eventTypeSync = await step.run('sync-calcom-event-types', async () => {
      const result = await syncMentorEventTypesForUser(userId)
      if (!result.success) throw new Error(`Cal.com event type sync failed (${result.error})`)
      return result
    })
    // Persisting webhookId is the readiness marker, so this must be the final step.
    const webhookId = await step.run('ensure-calcom-webhook', () => ensureCalcomWebhook(userId))
    return { userId, webhookId, eventTypeSync }
  }
)

/**
 * Recover active OAuth connections that never reached the webhook readiness
 * marker (for example, after an enqueue outage or exhausted provider retries).
 * The per-connection worker and advisory lock make duplicate recovery events
 * safe while keeping this scan bounded.
 */
export const reconcileCalcomConnections = inngest.createFunction(
  {
    id: 'reconcile-calcom-connections',
    name: 'Reconcile Cal.com Connections',
    triggers: { cron: '*/15 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const recoveryBatch = await step.run('load-incomplete-calcom-connections', async () => {
      const candidates: Array<{ userId: string }> = []
      let cursor: string | undefined
      for (;;) {
        const page = await db
          .select({ userId: calcomToken.userId })
          .from(calcomToken)
          .where(
            and(
              eq(calcomToken.authMode, 'oauth'),
              isNull(calcomToken.disconnectedAt),
              isNotNull(calcomToken.accessToken),
              isNotNull(calcomToken.refreshToken),
              or(
                isNull(calcomToken.webhookId),
                isNull(calcomToken.webhookSecret),
                isNull(calcomToken.webhookRouteKey),
                isNull(calcomToken.webhookRouteKeyHash)
              ),
              ...(cursor ? [gt(calcomToken.userId, cursor)] : [])
            )
          )
          .orderBy(calcomToken.userId)
          .limit(100)
        candidates.push(...page)
        if (page.length < 100) break
        cursor = page.at(-1)?.userId
        if (!cursor || candidates.length >= 10_000) {
          throw new Error('Incomplete Cal.com connection scan exceeded its safe limit')
        }
      }

      return { candidates, batchId: Date.now() }
    })

    if (recoveryBatch.candidates.length === 0) return { queued: 0 }

    for (let offset = 0; offset < recoveryBatch.candidates.length; offset += 100) {
      await step.sendEvent(
        `requeue-incomplete-calcom-connections-${offset / 100}`,
        recoveryBatch.candidates.slice(offset, offset + 100).map(candidate => ({
          id: `calcom-connection-recovery-${candidate.userId}-${recoveryBatch.batchId}`,
          name: 'discuno/calcom.connection-sync.requested' as const,
          data: { userId: candidate.userId },
        }))
      )
    }

    return { queued: recoveryBatch.candidates.length }
  }
)

/**
 * A mentor can change or delete an account webhook in Cal.com. Re-provision
 * every ready connection on a bounded cadence and, as a side effect, rewrite
 * its encrypted webhook identity under the current primary encryption key.
 */
export const verifyReadyCalcomConnections = inngest.createFunction(
  {
    id: 'verify-ready-calcom-connections',
    name: 'Verify Ready Cal.com Connections',
    triggers: { cron: '17 */6 * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const auditBatch = await step.run('load-ready-calcom-connections', async () => {
      const candidates: Array<{ userId: string }> = []
      let cursor: string | undefined
      for (;;) {
        const page = await db
          .select({ userId: calcomToken.userId })
          .from(calcomToken)
          .where(
            and(
              eq(calcomToken.authMode, 'oauth'),
              isNull(calcomToken.disconnectedAt),
              isNotNull(calcomToken.accessToken),
              isNotNull(calcomToken.refreshToken),
              isNotNull(calcomToken.webhookId),
              isNotNull(calcomToken.webhookSecret),
              isNotNull(calcomToken.webhookRouteKey),
              isNotNull(calcomToken.webhookRouteKeyHash),
              ...(cursor ? [gt(calcomToken.userId, cursor)] : [])
            )
          )
          .orderBy(calcomToken.userId)
          .limit(100)
        candidates.push(...page)
        if (page.length < 100) break
        cursor = page.at(-1)?.userId
        if (!cursor || candidates.length >= 10_000) {
          throw new Error('Ready Cal.com connection audit exceeded its safe limit')
        }
      }
      return { candidates, batchId: Date.now() }
    })

    if (auditBatch.candidates.length === 0) return { queued: 0 }

    for (let offset = 0; offset < auditBatch.candidates.length; offset += 100) {
      await step.sendEvent(
        `audit-ready-calcom-connections-${offset / 100}`,
        auditBatch.candidates.slice(offset, offset + 100).map(candidate => ({
          id: `calcom-connection-audit-${candidate.userId}-${auditBatch.batchId}`,
          name: 'discuno/calcom.connection-sync.requested' as const,
          data: { userId: candidate.userId },
        }))
      )
    }
    return { queued: auditBatch.candidates.length }
  }
)

const refreshWebhookCleanupAccessToken = async ({
  cleanupId,
  userId,
  encryptedRefreshToken,
}: {
  cleanupId: number
  userId: string
  encryptedRefreshToken: string | null
}): Promise<string> => {
  if (!encryptedRefreshToken) {
    throw new NonRetriableError('Cal.com webhook cleanup credentials are missing')
  }

  let refreshed
  try {
    refreshed = await refreshCalcomOAuthTokens(decryptCalcomToken(encryptedRefreshToken, userId))
  } catch (error) {
    if (error instanceof CalcomOAuthTokenError && error.oauthErrorCode === 'invalid_grant') {
      throw new NonRetriableError('Cal.com webhook cleanup authorization was revoked')
    }
    throw error
  }

  const now = new Date()
  await db
    .update(calcomWebhookCleanup)
    .set({
      accessToken: encryptCalcomToken(refreshed.access_token, userId),
      refreshToken: encryptCalcomToken(refreshed.refresh_token, userId),
      accessTokenExpiresAt: new Date(now.getTime() + refreshed.expires_in * 1000),
      updatedAt: now,
    })
    .where(
      and(
        eq(calcomWebhookCleanup.id, cleanupId),
        isNull(calcomWebhookCleanup.processedAt),
        isNull(calcomWebhookCleanup.quarantinedAt)
      )
    )
  return refreshed.access_token
}

/**
 * Delete a webhook from a previously connected Cal.com account. The active
 * connection is intentionally never read: its credentials may already belong
 * to a different account.
 */
export const cleanupDisconnectedCalcomWebhook = inngest.createFunction(
  {
    id: 'cleanup-disconnected-calcom-webhook',
    name: 'Clean Up Disconnected Cal.com Webhook',
    triggers: { event: 'discuno/calcom.webhook-cleanup.requested' },
    retries: 8,
  },
  async ({ event, step }) => {
    const { cleanupId } = event.data as CalcomWebhookCleanupRequestedEvent['data']
    return step.run('claim-and-delete-calcom-webhook', async () => {
      const claimedAt = new Date()
      const staleProcessingCutoff = new Date(claimedAt.getTime() - 2 * 60 * 1000)
      const [claimed] = await db
        .update(calcomWebhookCleanup)
        .set({
          queuedAt: claimedAt,
          processingStartedAt: claimedAt,
          attemptCount: sql`${calcomWebhookCleanup.attemptCount} + 1`,
          updatedAt: claimedAt,
        })
        .where(
          and(
            eq(calcomWebhookCleanup.id, cleanupId),
            isNull(calcomWebhookCleanup.processedAt),
            isNull(calcomWebhookCleanup.quarantinedAt),
            or(
              isNull(calcomWebhookCleanup.processingStartedAt),
              lt(calcomWebhookCleanup.processingStartedAt, staleProcessingCutoff)
            )
          )
        )
        .returning({
          userId: calcomWebhookCleanup.userId,
          calcomUserId: calcomWebhookCleanup.calcomUserId,
          webhookId: calcomWebhookCleanup.webhookId,
          accessToken: calcomWebhookCleanup.accessToken,
          refreshToken: calcomWebhookCleanup.refreshToken,
          accessTokenExpiresAt: calcomWebhookCleanup.accessTokenExpiresAt,
          attemptCount: calcomWebhookCleanup.attemptCount,
        })

      if (!claimed) {
        const [existing] = await db
          .select({
            processedAt: calcomWebhookCleanup.processedAt,
            processingStartedAt: calcomWebhookCleanup.processingStartedAt,
            quarantinedAt: calcomWebhookCleanup.quarantinedAt,
          })
          .from(calcomWebhookCleanup)
          .where(eq(calcomWebhookCleanup.id, cleanupId))
          .limit(1)
        if (!existing)
          throw new NonRetriableError(`Cal.com webhook cleanup ${cleanupId} is missing`)
        if (existing.processedAt) return { cleanupId, status: 'already_processed' }
        if (existing.quarantinedAt) return { cleanupId, status: 'quarantined' }
        throw new Error(`Cal.com webhook cleanup ${cleanupId} is already processing`)
      }

      try {
        let accessToken: string | null = null
        if (claimed.accessToken) {
          accessToken = decryptCalcomToken(claimed.accessToken, claimed.userId)
        }

        const accessTokenNeedsRefresh =
          !accessToken ||
          (claimed.accessTokenExpiresAt !== null &&
            claimed.accessTokenExpiresAt.getTime() <= Date.now() + 2 * 60 * 1000)
        let refreshed = false
        if (accessTokenNeedsRefresh) {
          accessToken = await refreshWebhookCleanupAccessToken({
            cleanupId,
            userId: claimed.userId,
            encryptedRefreshToken: claimed.refreshToken,
          })
          refreshed = true
        }
        if (!accessToken) {
          throw new NonRetriableError('Cal.com webhook cleanup credentials are missing')
        }

        let deletionResult = await deleteCalcomWebhookWithAccessToken(
          claimed.webhookId,
          accessToken
        )
        if (deletionResult === 'unauthorized' && !refreshed) {
          accessToken = await refreshWebhookCleanupAccessToken({
            cleanupId,
            userId: claimed.userId,
            encryptedRefreshToken: claimed.refreshToken,
          })
          deletionResult = await deleteCalcomWebhookWithAccessToken(claimed.webhookId, accessToken)
        }
        if (deletionResult !== 'deleted') {
          throw new NonRetriableError('Cal.com webhook cleanup is no longer authorized')
        }

        const processedAt = new Date()
        await db
          .update(calcomWebhookCleanup)
          .set({
            accessToken: null,
            refreshToken: null,
            accessTokenExpiresAt: null,
            processingStartedAt: null,
            processedAt,
            lastError: null,
            updatedAt: processedAt,
          })
          .where(eq(calcomWebhookCleanup.id, cleanupId))
        return { cleanupId, webhookId: claimed.webhookId, status: 'processed' }
      } catch (error) {
        const isTerminal = error instanceof NonRetriableError
        const shouldQuarantine =
          isTerminal || claimed.attemptCount >= MAX_WEBHOOK_PROCESSING_ATTEMPTS
        const now = new Date()
        await db
          .update(calcomWebhookCleanup)
          .set({
            processingStartedAt: null,
            ...(shouldQuarantine
              ? {
                  accessToken: null,
                  refreshToken: null,
                  accessTokenExpiresAt: null,
                  quarantinedAt: now,
                }
              : {}),
            lastError: shouldQuarantine
              ? 'Webhook cleanup requires manual review'
              : 'Webhook cleanup failed',
            updatedAt: now,
          })
          .where(eq(calcomWebhookCleanup.id, cleanupId))

        if (shouldQuarantine) {
          console.error('Cal.com webhook cleanup was quarantined', {
            cleanupId,
            webhookId: claimed.webhookId,
          })
          await sendOperationalAlert({
            type: 'CALCOM_WEBHOOK_CLEANUP_QUARANTINED',
            reference: cleanupId.toString(),
            summary: `Webhook ${claimed.webhookId} could not be removed automatically and requires manual review.`,
          })
          throw new NonRetriableError('Cal.com webhook cleanup was quarantined')
        }
        throw error
      }
    })
  }
)

/** Process signed Cal.com payloads from the database without exposing PII to Inngest events. */
export const processCalcomWebhook = inngest.createFunction(
  {
    id: 'process-calcom-webhook',
    name: 'Process Cal.com Webhook',
    triggers: { event: 'calcom/webhook.received' },
    retries: 8,
  },
  async ({ event, step }) => {
    const { inboxId } = event.data as ProcessCalcomWebhookEvent['data']
    return step.run('claim-and-process-calcom-webhook', async () => {
      const claimedAt = new Date()
      const staleProcessingCutoff = new Date(Date.now() - 2 * 60 * 1000)
      const [claimed] = await db
        .update(calcomWebhookInbox)
        .set({
          queuedAt: claimedAt,
          processingStartedAt: claimedAt,
          attemptCount: sql`${calcomWebhookInbox.attemptCount} + 1`,
          updatedAt: claimedAt,
        })
        .where(
          and(
            eq(calcomWebhookInbox.id, inboxId),
            isNull(calcomWebhookInbox.processedAt),
            isNull(calcomWebhookInbox.quarantinedAt),
            or(
              isNull(calcomWebhookInbox.processingStartedAt),
              lt(calcomWebhookInbox.processingStartedAt, staleProcessingCutoff)
            )
          )
        )
        .returning({
          payload: calcomWebhookInbox.payload,
          triggerEvent: calcomWebhookInbox.triggerEvent,
          attemptCount: calcomWebhookInbox.attemptCount,
          connectionUserId: calcomWebhookInbox.connectionUserId,
          calcomUserId: calcomWebhookInbox.calcomUserId,
        })

      if (!claimed) {
        const [existing] = await db
          .select({
            processedAt: calcomWebhookInbox.processedAt,
            processingStartedAt: calcomWebhookInbox.processingStartedAt,
            quarantinedAt: calcomWebhookInbox.quarantinedAt,
          })
          .from(calcomWebhookInbox)
          .where(eq(calcomWebhookInbox.id, inboxId))
          .limit(1)
        if (!existing) throw new NonRetriableError(`Cal.com webhook inbox ${inboxId} is missing`)
        if (existing.processedAt) return { inboxId, status: 'already_processed' }
        if (existing.quarantinedAt) return { inboxId, status: 'quarantined' }

        // A prior invocation may have terminated after claiming the row. Keep
        // retrying until its lease expires instead of acknowledging and losing
        // the only durable queue event.
        throw new Error(`Cal.com webhook inbox ${inboxId} is already processing`)
      }

      let handlerStatus: number | null = null
      try {
        const response = await processCalcomWebhookEvent(
          claimed.payload,
          claimed.connectionUserId && claimed.calcomUserId !== null
            ? {
                expectedMentorUserId: claimed.connectionUserId,
                expectedCalcomUserId: claimed.calcomUserId,
              }
            : undefined
        )
        handlerStatus = response.status
        if (response.status >= 500) throw new Error('Cal.com webhook processing failed')
        if (response.status >= 400) {
          throw new NonRetriableError('Signed Cal.com webhook payload is invalid')
        }

        await db
          .update(calcomWebhookInbox)
          .set({
            processedAt: new Date(),
            processingStartedAt: null,
            payload: {},
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(calcomWebhookInbox.id, inboxId))
        return { inboxId, triggerEvent: claimed.triggerEvent, status: 'processed' }
      } catch (error) {
        const isTerminal = error instanceof NonRetriableError
        // A signed payload rejected by our current schema is operational drift,
        // not successful processing. Quarantine and alert it immediately so a
        // cancellation/no-show contract change cannot silently drop financial
        // work. Payload data is still scrubbed for privacy.
        const shouldQuarantine =
          isTerminal || claimed.attemptCount >= MAX_WEBHOOK_PROCESSING_ATTEMPTS
        const quarantinedAt = shouldQuarantine ? new Date() : null
        const failureFingerprint = isTerminal
          ? `Signed webhook rejected (HTTP ${handlerStatus ?? 'unknown'}; trigger ${claimed.triggerEvent})`
          : shouldQuarantine
            ? `Webhook processing exhausted retries (trigger ${claimed.triggerEvent})`
            : 'Webhook processing failed'
        await db
          .update(calcomWebhookInbox)
          .set({
            processingStartedAt: null,
            ...(shouldQuarantine ? { payload: {}, quarantinedAt } : {}),
            lastError: failureFingerprint,
            updatedAt: new Date(),
          })
          .where(eq(calcomWebhookInbox.id, inboxId))
        if (shouldQuarantine) {
          console.error('Cal.com webhook inbox record was quarantined', {
            inboxId,
            triggerEvent: claimed.triggerEvent,
          })
          await sendOperationalAlert({
            type: 'CALCOM_WEBHOOK_QUARANTINED',
            reference: inboxId.toString(),
            summary: `${failureFingerprint}. Attempt ${claimed.attemptCount}; the payload was scrubbed.`,
          })
          throw new NonRetriableError('Cal.com webhook processing was quarantined')
        }
        throw error
      }
    })
  }
)

const processStoredStripeWebhook = async (
  inboxId: number,
  source: 'platform' | 'connect'
): Promise<{ inboxId: number; eventType?: string; status: string }> => {
  const claimedAt = new Date()
  const staleProcessingCutoff = new Date(claimedAt.getTime() - 2 * 60 * 1000)
  const [claimed] = await db
    .update(stripeWebhookInbox)
    .set({
      queuedAt: claimedAt,
      processingStartedAt: claimedAt,
      attemptCount: sql`${stripeWebhookInbox.attemptCount} + 1`,
      updatedAt: claimedAt,
    })
    .where(
      and(
        eq(stripeWebhookInbox.id, inboxId),
        eq(stripeWebhookInbox.source, source),
        isNull(stripeWebhookInbox.processedAt),
        isNull(stripeWebhookInbox.quarantinedAt),
        or(
          isNull(stripeWebhookInbox.processingStartedAt),
          lt(stripeWebhookInbox.processingStartedAt, staleProcessingCutoff)
        )
      )
    )
    .returning({
      eventId: stripeWebhookInbox.eventId,
      eventType: stripeWebhookInbox.eventType,
      connectedAccountId: stripeWebhookInbox.connectedAccountId,
      attemptCount: stripeWebhookInbox.attemptCount,
    })

  if (!claimed) {
    const [existing] = await db
      .select({
        processedAt: stripeWebhookInbox.processedAt,
        processingStartedAt: stripeWebhookInbox.processingStartedAt,
        quarantinedAt: stripeWebhookInbox.quarantinedAt,
      })
      .from(stripeWebhookInbox)
      .where(and(eq(stripeWebhookInbox.id, inboxId), eq(stripeWebhookInbox.source, source)))
      .limit(1)
    if (!existing) throw new NonRetriableError(`Stripe webhook inbox ${inboxId} is missing`)
    if (existing.processedAt) return { inboxId, status: 'already_processed' }
    if (existing.quarantinedAt) return { inboxId, status: 'quarantined' }
    throw new Error(`Stripe webhook inbox ${inboxId} is already processing`)
  }

  try {
    const stripeEvent =
      source === 'connect' && claimed.connectedAccountId
        ? await stripe.events.retrieve(
            claimed.eventId,
            {},
            { stripeAccount: claimed.connectedAccountId }
          )
        : await stripe.events.retrieve(claimed.eventId)

    if (source === 'connect') await processStripeConnectWebhookEvent(stripeEvent)
    else await processStripeWebhookEvent(stripeEvent)

    const processedAt = new Date()
    await db
      .update(stripeWebhookInbox)
      .set({
        processedAt,
        processingStartedAt: null,
        lastError: null,
        updatedAt: processedAt,
      })
      .where(eq(stripeWebhookInbox.id, inboxId))
    return { inboxId, eventType: stripeEvent.type, status: 'processed' }
  } catch (error) {
    const shouldQuarantine = claimed.attemptCount >= MAX_WEBHOOK_PROCESSING_ATTEMPTS
    const quarantinedAt = shouldQuarantine ? new Date() : null
    await db
      .update(stripeWebhookInbox)
      .set({
        processingStartedAt: null,
        ...(shouldQuarantine ? { quarantinedAt } : {}),
        lastError: shouldQuarantine
          ? 'Stripe webhook processing quarantined after repeated failures'
          : 'Stripe webhook processing failed',
        updatedAt: new Date(),
      })
      .where(eq(stripeWebhookInbox.id, inboxId))
    if (shouldQuarantine) {
      console.error('Stripe webhook inbox record was quarantined', { inboxId, source })
      await sendOperationalAlert({
        type: 'STRIPE_WEBHOOK_QUARANTINED',
        reference: inboxId.toString(),
        summary: `Event ${claimed.eventType} from ${source} exceeded ${MAX_WEBHOOK_PROCESSING_ATTEMPTS} attempts.`,
      })
      throw new NonRetriableError('Stripe webhook processing was quarantined')
    }
    throw error
  }
}

/** Recover provider-webhook deletions stranded by a queue or worker outage. */
export const reconcileCalcomWebhookCleanup = inngest.createFunction(
  {
    id: 'reconcile-calcom-webhook-cleanup',
    name: 'Reconcile Cal.com Webhook Cleanup',
    triggers: { cron: '*/5 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const recoveryBatch = await step.run('load-stranded-calcom-webhook-cleanups', async () => {
      const now = new Date()
      const staleQueueCutoff = new Date(now.getTime() - 10 * 60 * 1000)
      const staleProcessingCutoff = new Date(now.getTime() - 2 * 60 * 1000)
      const candidates = await db
        .select({ id: calcomWebhookCleanup.id })
        .from(calcomWebhookCleanup)
        .where(
          and(
            isNull(calcomWebhookCleanup.processedAt),
            isNull(calcomWebhookCleanup.quarantinedAt),
            or(
              isNull(calcomWebhookCleanup.queuedAt),
              lt(calcomWebhookCleanup.queuedAt, staleQueueCutoff)
            ),
            or(
              isNull(calcomWebhookCleanup.processingStartedAt),
              lt(calcomWebhookCleanup.processingStartedAt, staleProcessingCutoff)
            )
          )
        )
        .limit(100)

      return { candidates, batchId: now.getTime() }
    })

    if (recoveryBatch.candidates.length === 0) return { queued: 0 }

    await step.sendEvent(
      'requeue-stranded-calcom-webhook-cleanups',
      recoveryBatch.candidates.map(candidate => ({
        id: `calcom-webhook-cleanup-recovery-${candidate.id}-${recoveryBatch.batchId}`,
        name: 'discuno/calcom.webhook-cleanup.requested' as const,
        data: { cleanupId: candidate.id },
      }))
    )

    await step.run('mark-recovered-calcom-webhook-cleanups-queued', async () => {
      const queuedAt = new Date()
      await db
        .update(calcomWebhookCleanup)
        .set({ queuedAt, updatedAt: queuedAt })
        .where(
          and(
            isNull(calcomWebhookCleanup.processedAt),
            isNull(calcomWebhookCleanup.quarantinedAt),
            inArray(
              calcomWebhookCleanup.id,
              recoveryBatch.candidates.map(candidate => candidate.id)
            )
          )
        )
    })

    return { queued: recoveryBatch.candidates.length }
  }
)

/**
 * Recover inbox rows stranded by a queue outage, an exhausted delivery, or a
 * crash between enqueue and the queuedAt update. The inbox claim remains the
 * concurrency boundary, so duplicate recovery events are harmless.
 */
export const reconcileCalcomWebhookInbox = inngest.createFunction(
  {
    id: 'reconcile-calcom-webhook-inbox',
    name: 'Reconcile Cal.com Webhook Inbox',
    triggers: { cron: '*/5 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const recoveryBatch = await step.run('load-stranded-calcom-webhooks', async () => {
      const now = new Date()
      const staleQueueCutoff = new Date(now.getTime() - 10 * 60 * 1000)
      const staleProcessingCutoff = new Date(now.getTime() - 2 * 60 * 1000)
      const candidates = await db
        .select({ id: calcomWebhookInbox.id })
        .from(calcomWebhookInbox)
        .where(
          and(
            isNull(calcomWebhookInbox.processedAt),
            isNull(calcomWebhookInbox.quarantinedAt),
            or(
              isNull(calcomWebhookInbox.queuedAt),
              lt(calcomWebhookInbox.queuedAt, staleQueueCutoff)
            ),
            or(
              isNull(calcomWebhookInbox.processingStartedAt),
              lt(calcomWebhookInbox.processingStartedAt, staleProcessingCutoff)
            )
          )
        )
        .limit(100)

      return { candidates, batchId: now.getTime() }
    })

    if (recoveryBatch.candidates.length === 0) return { queued: 0 }

    await step.sendEvent(
      'requeue-stranded-calcom-webhooks',
      recoveryBatch.candidates.map(candidate => ({
        id: `calcom-webhook-recovery-${candidate.id}-${recoveryBatch.batchId}`,
        name: 'calcom/webhook.received' as const,
        data: { inboxId: candidate.id },
      }))
    )

    await step.run('mark-recovered-calcom-webhooks-queued', async () => {
      const queuedAt = new Date()
      await db
        .update(calcomWebhookInbox)
        .set({ queuedAt, updatedAt: queuedAt })
        .where(
          and(
            isNull(calcomWebhookInbox.processedAt),
            inArray(
              calcomWebhookInbox.id,
              recoveryBatch.candidates.map(candidate => candidate.id)
            )
          )
        )
    })

    return { queued: recoveryBatch.candidates.length }
  }
)

/** Recover verified Stripe event IDs after queue or worker retry exhaustion. */
export const reconcileStripeWebhookInbox = inngest.createFunction(
  {
    id: 'reconcile-stripe-webhook-inbox',
    name: 'Reconcile Stripe Webhook Inbox',
    triggers: { cron: '*/5 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const recoveryBatch = await step.run('load-stranded-stripe-webhooks', async () => {
      const now = new Date()
      const staleQueueCutoff = new Date(now.getTime() - 10 * 60 * 1000)
      const staleProcessingCutoff = new Date(now.getTime() - 2 * 60 * 1000)
      const candidates = await db
        .select({ id: stripeWebhookInbox.id, source: stripeWebhookInbox.source })
        .from(stripeWebhookInbox)
        .where(
          and(
            isNull(stripeWebhookInbox.processedAt),
            isNull(stripeWebhookInbox.quarantinedAt),
            or(
              isNull(stripeWebhookInbox.queuedAt),
              lt(stripeWebhookInbox.queuedAt, staleQueueCutoff)
            ),
            or(
              isNull(stripeWebhookInbox.processingStartedAt),
              lt(stripeWebhookInbox.processingStartedAt, staleProcessingCutoff)
            )
          )
        )
        .limit(100)

      return { candidates, batchId: now.getTime() }
    })

    if (recoveryBatch.candidates.length === 0) return { queued: 0 }

    await step.sendEvent(
      'requeue-stranded-stripe-webhooks',
      recoveryBatch.candidates.map(candidate => ({
        id: `stripe-webhook-recovery-${candidate.id}-${recoveryBatch.batchId}`,
        name:
          candidate.source === 'connect'
            ? ('stripe/connect-webhook.received' as const)
            : ('stripe/webhook.received' as const),
        data: { inboxId: candidate.id },
      }))
    )

    await step.run('mark-recovered-stripe-webhooks-queued', async () => {
      const queuedAt = new Date()
      await db
        .update(stripeWebhookInbox)
        .set({ queuedAt, updatedAt: queuedAt })
        .where(
          and(
            isNull(stripeWebhookInbox.processedAt),
            inArray(
              stripeWebhookInbox.id,
              recoveryBatch.candidates.map(candidate => candidate.id)
            )
          )
        )
    })

    return { queued: recoveryBatch.candidates.length }
  }
)

/**
 * Stripe recommends acknowledging verified webhooks before complex processing.
 * Only the opaque event ID is stored in Inngest; the signed event is retrieved
 * and processed inside one durable step so its payload is never persisted there.
 */
export const processStripeWebhook = inngest.createFunction(
  {
    id: 'process-stripe-webhook',
    name: 'Process Stripe Webhook',
    triggers: { event: 'stripe/webhook.received' },
    retries: 8,
  },
  async ({ event, step }) => {
    const { inboxId } = event.data as ProcessStripeWebhookEvent['data']
    return step.run('claim-and-process-stripe-event', () =>
      processStoredStripeWebhook(inboxId, 'platform')
    )
  }
)

export const processStripeConnectWebhook = inngest.createFunction(
  {
    id: 'process-stripe-connect-webhook',
    name: 'Process Stripe Connect Webhook',
    triggers: { event: 'stripe/connect-webhook.received' },
    retries: 8,
  },
  async ({ event, step }) => {
    const { inboxId } = event.data as ProcessStripeConnectWebhookEvent['data']
    return step.run('claim-and-process-stripe-connect-event', () =>
      processStoredStripeWebhook(inboxId, 'connect')
    )
  }
)

/**
 * Process checkout session side effects
 *
 * This function handles:
 * 1. PostHog event tracking
 * 2. Cal.com booking creation
 * 3. Refunds (if booking fails)
 * 4. Admin alerts (if refund fails)
 * 5. Failure emails
 *
 * Inngest provides automatic retries with exponential backoff
 */
export const processCheckoutSideEffects = inngest.createFunction(
  {
    id: 'process-checkout-side-effects',
    name: 'Process Checkout Session Side Effects',
    triggers: { event: 'stripe/checkout.completed' },
    retries: 5,
    onFailure: async ({ event, step }) => {
      const originalEvent = event.data.event as unknown as ProcessCheckoutSideEffectsEvent
      const { paymentId } = originalEvent.data
      // Deliberately load PII outside step.run: Inngest persists step outputs.
      const context = await loadCheckoutFulfillmentContext(paymentId)
      const { paymentIntentId, metadata } = context

      // Give a successful-but-ambiguous Cal.com request time to deliver its webhook.
      await step.sleep('wait-for-cal-booking-reconciliation', '2m')
      const terminalSettlement = await step.run('settle-exhausted-checkout', async () => {
        try {
          return await settleTerminalCheckout({
            paymentId,
            refundIfNoBooking: true,
            refundPurpose: 'booking_creation_failed',
            paymentHoldCancellationReason:
              'Session cancelled because its payment became held during fulfillment',
          })
        } catch (reconciliationError) {
          return {
            status: 'reconciliation_ambiguous' as const,
            errorName: getSafeErrorName(reconciliationError),
          }
        }
      })

      if (terminalSettlement.status === 'booking_recovered') {
        await step.run('consume-recovered-checkout-slot-reservation', () =>
          releaseCheckoutSlotReservationFromMetadata(metadata, { consumed: true })
        )
        await step.run('alert-booking-workflow-recovered', () =>
          sendAdminAlert({
            type: 'CHECKOUT_WORKFLOW_RECOVERED_BOOKING',
            paymentId,
            error: 'A verified Cal.com booking was recovered after fulfillment exhausted retries',
          })
        )
        return { success: true, bookingPreserved: true }
      }

      if (
        terminalSettlement.status === 'reconciliation_ambiguous' ||
        terminalSettlement.status === 'provider_absence_ambiguous'
      ) {
        const errorName =
          terminalSettlement.status === 'reconciliation_ambiguous'
            ? terminalSettlement.errorName
            : 'PriorProviderMutation'
        await step.run('hold-ambiguous-booking-for-manual-review', async () => {
          await withPaymentOperationLock(paymentId, () =>
            db
              .update(payment)
              .set({
                requiresManualReview: true,
                reviewReason:
                  'Cal.com checkout reconciliation is ambiguous after fulfillment retries',
                updatedAt: new Date(),
              })
              .where(eq(payment.id, paymentId))
          )
          await sendAdminAlert({
            type: 'CHECKOUT_BOOKING_RECONCILIATION_FAILED',
            paymentId,
            error: `Provider reconciliation requires manual review (${errorName})`,
          })
        })
        await step.run('send-ambiguous-booking-email', () =>
          sendBookingFailureEmail({
            paymentId,
            attendeeEmail: metadata.attendeeEmail,
            attendeeName: metadata.attendeeName,
            mentorName: metadata.mentorUsername,
            refundSucceeded: false,
            reason:
              'We could not confirm your booking safely. Please contact support so we can resolve your booking and payment.',
          })
        )
        return { success: false, manualReview: true, paymentIntentId }
      }

      await step.run('release-unfulfilled-checkout-slot-reservation', () =>
        releaseCheckoutSlotReservationFromMetadata(metadata)
      )

      if (terminalSettlement.status === 'booking_recovered_payment_held') {
        return {
          success: false,
          skipped: true,
          reason: terminalSettlement.reason,
          paymentIntentId,
        }
      }

      if (terminalSettlement.status === 'payment_held') {
        return { success: false, skipped: true, reason: 'payment_held', paymentIntentId }
      }

      if (terminalSettlement.status === 'refund_failed') {
        await step.run('alert-manual-refund', () =>
          sendAdminAlert({
            type: 'CHECKOUT_AUTOMATIC_REFUND_FAILED',
            paymentId,
            error: 'Automatic refund failed after booking fulfillment exhausted retries',
          })
        )
      }

      const refundSucceeded = terminalSettlement.status === 'refunded'
      await step.run('send-booking-failure-email', () =>
        sendBookingFailureEmail({
          paymentId,
          attendeeEmail: metadata.attendeeEmail,
          attendeeName: metadata.attendeeName,
          mentorName: metadata.mentorUsername,
          refundSucceeded,
          reason: refundSucceeded
            ? 'We could not create your booking after several attempts. Your refund has been initiated.'
            : 'We could not create your booking. Please contact support so we can resolve your payment.',
        })
      )

      return { success: refundSucceeded, paymentIntentId }
    },
  },
  async ({ event, step, logger }) => {
    // Deliberately load PII outside step.run: Inngest persists step outputs.
    const context = await loadCheckoutFulfillmentContext(event.data.paymentId)
    const { paymentId, paymentIntentId, sessionId, metadata, sessionAmount, sessionCurrency } =
      context

    logger.info('Processing checkout side effects', { sessionId, paymentIntentId })

    // Step 1: Track payment success in PostHog
    await step.run('track-payment-posthog', async () => {
      try {
        await trackServerEvent(metadata.mentorUserId, 'payment_succeeded', {
          sessionId,
          paymentIntentId,
          amount: sessionAmount,
          currency: sessionCurrency,
          mentorFee: parseInt(metadata.mentorFee),
          mentorAmount: parseInt(metadata.mentorAmount),
        })
        logger.info('PostHog event tracked successfully')
      } catch (error) {
        // Don't fail the entire function if PostHog tracking fails
        logger.error('Failed to track PostHog event', { errorName: getSafeErrorName(error) })
      }
    })

    // Step 2: Cal.com creation is retried independently. The helper reconciles
    // ambiguous responses by the payment ID before attempting another POST.
    const fulfillment = await step.run('create-and-store-calcom-booking', () =>
      withPaymentOperationLock(paymentId, async () => {
        // Refunds, disputes, failures, and manual-review holds use the same
        // payment lock, so none can race a new provider booking through here.
        const currentContext = await loadCheckoutFulfillmentContext(paymentId)
        if (!isCheckoutPaymentFulfillable(currentContext)) {
          return { status: 'skipped_payment_held' as const }
        }

        const providerGate = await reconcileStripeStateBeforeFulfillment(paymentId)
        if (!providerGate.fulfillable) {
          return {
            status: 'skipped_provider_held' as const,
            reason: providerGate.reason ?? 'provider_hold',
          }
        }

        const [localBooking] = await db
          .select({
            calcomBookingId: booking.calcomBookingId,
            calcomUid: booking.calcomUid,
            startTime: booking.startTime,
            endTime: booking.endTime,
          })
          .from(booking)
          .where(
            and(
              eq(booking.paymentId, paymentId),
              currentContext.calcomBookingUid
                ? eq(booking.calcomUid, currentContext.calcomBookingUid)
                : or(ne(booking.status, 'CANCELLED'), eq(booking.mentorPayoutEligible, true))
            )
          )
          .limit(1)
        if (localBooking) {
          await verifyPaidProviderBooking({
            context: currentContext,
            bookingUid: localBooking.calcomUid,
            localBooking,
          })
          return { status: 'booked' as const, uid: localBooking.calcomUid }
        }

        // A stored provider UID proves an earlier create crossed the external
        // boundary. Reconcile that exact metadata before doing anything else;
        // never issue another POST merely because the local snapshot is missing.
        if (currentContext.calcomBookingUid) {
          const verifiedBooking = await verifyPaidProviderBooking({
            context: currentContext,
            bookingUid: currentContext.calcomBookingUid,
          })
          await persistCheckoutBookingSnapshot({
            context: currentContext,
            calcomBooking: verifiedBooking,
          })
          return { status: 'booked' as const, uid: verifiedBooking.uid }
        }

        const [currentEventType] = await db
          .select({
            duration: mentorEventType.duration,
            bookingCompatible: mentorEventType.bookingCompatible,
          })
          .from(mentorEventType)
          .where(
            and(
              eq(mentorEventType.mentorUserId, metadata.mentorUserId),
              eq(mentorEventType.calcomEventTypeId, Number(metadata.eventTypeId))
            )
          )
          .limit(1)
        const checkoutDuration = Number(metadata.eventDurationMinutes)
        if (
          !currentEventType ||
          currentEventType.bookingCompatible !== true ||
          currentEventType.duration !== checkoutDuration
        ) {
          return { status: 'configuration_changed' as const }
        }

        const bookingArgs = {
          calcomEventTypeId: Number(metadata.eventTypeId),
          start: new Date(metadata.startTime).toISOString(),
          attendeeName: metadata.attendeeName,
          attendeeEmail: metadata.attendeeEmail,
          attendeePhone: metadata.attendeePhone,
          bookingTitle: metadata.attendeeTopic ?? `Session with ${metadata.attendeeName}`,
          timeZone: metadata.attendeeTimeZone,
          paymentId,
          mentorUserId: metadata.mentorUserId,
          actorUserId: metadata.actorUserId,
          lengthInMinutes: checkoutDuration,
          providerMutationMayBeInFlight: currentContext.calcomBookingCreateAttemptedAt !== null,
          onBeforeCreateAttempt: async () => {
            const attemptedAt = new Date().toISOString()
            const markedPayments = await db
              .update(payment)
              .set({
                metadata: sql`coalesce(${payment.metadata}, '{}'::jsonb) || ${JSON.stringify({ calcomBookingCreateAttemptedAt: attemptedAt })}::jsonb`,
                updatedAt: new Date(),
              })
              .where(eq(payment.id, paymentId))
              .returning({ id: payment.id })
            if (markedPayments.length !== 1) {
              throw new Error('Cal.com booking create attempt marker could not be persisted')
            }
          },
          onDefinitiveCreateRejection: async () => {
            const resolvedPayments = await db
              .update(payment)
              .set({
                metadata: sql`coalesce(${payment.metadata}, '{}'::jsonb) - 'calcomBookingCreateAttemptedAt'`,
                updatedAt: new Date(),
              })
              .where(eq(payment.id, paymentId))
              .returning({ id: payment.id })
            if (resolvedPayments.length !== 1) {
              throw new Error('Cal.com booking create rejection marker could not be resolved')
            }
          },
        }

        const createAndPersistBooking = async () => {
          logger.info('Creating or reconciling Cal.com booking', {
            eventTypeId: bookingArgs.calcomEventTypeId,
          })
          const createdBooking = await createCalcomBooking(bookingArgs)
          // The create/list response is only a candidate identity. Re-read the
          // exact UID through the mentor's OAuth connection and attest every
          // immutable paid-checkout field before linking money or scheduling payout.
          const verifiedBooking = await verifyPaidProviderBooking({
            context: currentContext,
            bookingUid: createdBooking.uid,
          })
          await persistCheckoutBookingSnapshot({
            context: currentContext,
            calcomBooking: verifiedBooking,
          })
          return { status: 'booked' as const, uid: verifiedBooking.uid }
        }

        const {
          bookingAttemptId,
          calcomReservationUid,
          calcomReservationUntil,
          checkoutReservationGeneration,
        } = metadata
        const reservationMetadata = [
          bookingAttemptId,
          calcomReservationUid,
          calcomReservationUntil,
          checkoutReservationGeneration,
        ]
        const hasAnyReservationMetadata = reservationMetadata.some(Boolean)
        const hasCompleteReservationMetadata = reservationMetadata.every(Boolean)
        if (!hasAnyReservationMetadata) {
          // Rollout compatibility for a Session paid before the reservation
          // bridge was deployed.
          return createAndPersistBooking()
        }
        if (!hasCompleteReservationMetadata) {
          return { status: 'reservation_invalid' as const, reason: 'incomplete_metadata' }
        }
        if (
          !bookingAttemptId ||
          !calcomReservationUid ||
          !calcomReservationUntil ||
          !checkoutReservationGeneration
        ) {
          return { status: 'reservation_invalid' as const, reason: 'incomplete_metadata' }
        }

        const reservationResult = await withValidatedCheckoutSlotReservation(
          {
            bookingAttemptId,
            reservationUid: calcomReservationUid,
            reservationUntil: calcomReservationUntil,
            generation: Number(checkoutReservationGeneration),
            stripeCheckoutSessionId: sessionId,
            mentorUserId: metadata.mentorUserId,
            eventTypeId: Number(metadata.eventTypeId),
            startTime: metadata.startTime,
            durationMinutes: checkoutDuration,
          },
          createAndPersistBooking
        )
        if (!reservationResult.valid) {
          return {
            status: 'reservation_invalid' as const,
            reason: reservationResult.reason,
          }
        }
        return reservationResult.value
      })
    )

    if (
      fulfillment.status === 'skipped_payment_held' ||
      fulfillment.status === 'skipped_provider_held'
    ) {
      // A provider booking from an earlier ambiguous attempt may predate this
      // payment hold. Reconcile and, if found, persist then cancel it before
      // acknowledging the held checkout.
      await step.sleep('wait-for-held-checkout-booking-reconciliation', '2m')
      const heldSettlement = await step.run('settle-held-checkout-booking', () =>
        settleTerminalCheckout({
          paymentId,
          refundIfNoBooking: false,
          refundPurpose: 'booking_payment_held',
          paymentHoldCancellationReason: 'Session cancelled because its payment is held',
        })
      )

      if (heldSettlement.status === 'booking_recovered') {
        await step.run('consume-recovered-held-checkout-slot-reservation', () =>
          releaseCheckoutSlotReservationFromMetadata(metadata, { consumed: true })
        )
        return {
          success: true,
          bookingCreated: true,
          calcomBookingUid: heldSettlement.bookingUid,
        }
      }

      if (heldSettlement.status === 'provider_absence_ambiguous') {
        throw new Error('Cal.com booking state remains ambiguous after a prior create attempt')
      }

      await step.run('release-payment-held-slot-reservation', () =>
        releaseCheckoutSlotReservationFromMetadata(metadata)
      )
      if (heldSettlement.status === 'refund_failed' || heldSettlement.status === 'refunded') {
        throw new Error('Held checkout reached an invalid refund state')
      }
      const heldReason =
        heldSettlement.status === 'booking_recovered_payment_held'
          ? heldSettlement.reason
          : fulfillment.status === 'skipped_provider_held'
            ? fulfillment.reason
            : 'payment_held'
      logger.warn('Checkout fulfillment skipped because payment is held', {
        paymentId,
        reason: heldReason,
      })
      return { success: false, skipped: true, reason: heldReason }
    }

    if (fulfillment.status === 'configuration_changed') {
      await step.sleep('wait-for-configuration-change-booking-reconciliation', '2m')
      const settlement = await step.run('settle-configuration-changed-checkout', () =>
        settleTerminalCheckout({
          paymentId,
          refundIfNoBooking: true,
          refundPurpose: 'booking_configuration_changed',
          paymentHoldCancellationReason:
            'Session cancelled because its payment became held during fulfillment',
        })
      )

      if (settlement.status === 'booking_recovered') {
        await step.run('consume-configuration-recovered-slot-reservation', () =>
          releaseCheckoutSlotReservationFromMetadata(metadata, { consumed: true })
        )
        return {
          success: true,
          bookingCreated: true,
          calcomBookingUid: settlement.bookingUid,
        }
      }

      if (settlement.status === 'provider_absence_ambiguous') {
        throw new Error('Cal.com booking state remains ambiguous after a prior create attempt')
      }

      await step.run('release-configuration-changed-slot-reservation', () =>
        releaseCheckoutSlotReservationFromMetadata(metadata)
      )
      if (settlement.status === 'payment_held') {
        return { success: false, skipped: true, reason: 'payment_held' }
      }
      if (settlement.status === 'booking_recovered_payment_held') {
        return { success: false, skipped: true, reason: settlement.reason }
      }
      if (settlement.status === 'refund_failed') {
        throw new Error('Checkout refund failed after the mentor scheduling configuration changed')
      }
      await step.run('notify-checkout-scheduling-change', () =>
        sendBookingFailureEmail({
          paymentId,
          attendeeEmail: metadata.attendeeEmail,
          attendeeName: metadata.attendeeName,
          mentorName: metadata.mentorUsername,
          refundSucceeded: true,
          reason:
            'The mentor changed this session while you were checking out, so no booking was created and your refund has been initiated.',
        })
      )
      return { success: false, skipped: true, reason: 'configuration_changed' }
    }

    if (fulfillment.status === 'reservation_invalid') {
      // A previous Cal.com POST can succeed while its local snapshot write
      // fails. Give that provider mutation time to become queryable, then keep
      // the payment lock from authenticated reconciliation through any refund.
      await step.sleep('wait-for-reservation-loss-booking-reconciliation', '2m')
      const settlement = await step.run('settle-checkout-reservation-loss', () =>
        settleTerminalCheckout({
          paymentId,
          refundIfNoBooking: true,
          refundPurpose: 'booking_reservation_lost',
          paymentHoldCancellationReason:
            'Session cancelled because its payment became held during fulfillment',
        })
      )

      if (settlement.status === 'booking_recovered') {
        await step.run('consume-recovered-checkout-slot-reservation', () =>
          releaseCheckoutSlotReservationFromMetadata(metadata, { consumed: true })
        )
        await step.run('alert-reservation-loss-booking-recovered', () =>
          sendAdminAlert({
            type: 'CHECKOUT_RESERVATION_LOSS_BOOKING_RECOVERED',
            paymentId,
            error: `Cal.com booking ${settlement.bookingUid} was recovered before refund`,
          })
        )
        return {
          success: true,
          bookingCreated: true,
          calcomBookingUid: settlement.bookingUid,
        }
      }

      if (settlement.status === 'provider_absence_ambiguous') {
        throw new Error('Cal.com booking state remains ambiguous after a prior create attempt')
      }

      await step.run('release-invalid-checkout-slot-reservation', () =>
        releaseCheckoutSlotReservationFromMetadata(metadata)
      )

      if (settlement.status === 'payment_held') {
        logger.warn('Reservation-loss refund skipped because payment is already held', {
          paymentId,
        })
        return { success: false, skipped: true, reason: 'payment_held' }
      }

      if (settlement.status === 'booking_recovered_payment_held') {
        logger.warn('Recovered booking was cancelled because payment is held', {
          paymentId,
          reason: settlement.reason,
        })
        return { success: false, skipped: true, reason: settlement.reason }
      }

      if (settlement.status === 'refund_failed') {
        throw new Error('Checkout refund failed after its Cal.com reservation was lost')
      }
      await step.run('notify-checkout-reservation-loss', () =>
        sendBookingFailureEmail({
          paymentId,
          attendeeEmail: metadata.attendeeEmail,
          attendeeName: metadata.attendeeName,
          mentorName: metadata.mentorUsername,
          refundSucceeded: true,
          reason:
            'That time was no longer available when payment completed, so no booking was created and your refund has been initiated.',
        })
      )
      return { success: false, skipped: true, reason: fulfillment.reason }
    }

    await step.run('consume-booked-slot-reservation', () =>
      releaseCheckoutSlotReservationFromMetadata(metadata, { consumed: true })
    )

    return { success: true, bookingCreated: true, calcomBookingUid: fulfillment.uid }
  }
)

/** Release a mentor's 85% share only after the session and support window. */
export const processMentorPayout = inngest.createFunction(
  {
    id: 'process-mentor-payout',
    name: 'Process Mentor Payout',
    triggers: { event: 'payment/mentor-payout.scheduled' },
    retries: 5,
    onFailure: async ({ error, event, step }) => {
      const originalEvent = event.data.event as unknown as ProcessMentorPayoutEvent
      await step.run('hold-payout-for-manual-review', () =>
        db
          .update(payment)
          .set({
            requiresManualReview: true,
            reviewReason: `Mentor payout retries exhausted: ${error.message}`.slice(0, 500),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payment.id, originalEvent.data.paymentId),
              ne(payment.platformStatus, 'TRANSFERRED'),
              eq(payment.requiresManualReview, false)
            )
          )
      )
      await step.run('alert-payout-failure', () =>
        sendAdminAlert({
          type: 'MENTOR_PAYOUT_EXHAUSTED_RETRIES',
          paymentId: originalEvent.data.paymentId,
          error: error.message,
        })
      )
    },
  },
  async ({ event, step, logger }) => {
    const data = event.data as ProcessMentorPayoutEvent['data']
    const payoutEligibleAt = new Date(data.payoutEligibleAt)
    if (Number.isNaN(payoutEligibleAt.getTime())) {
      throw new NonRetriableError('Invalid mentor payout eligibility date')
    }

    await step.sleepUntil('wait-for-mentor-payout-window', payoutEligibleAt)

    const result = await step.run('transfer-mentor-payment', async () => {
      const result = await transferMentorPayment({
        paymentId: data.paymentId,
        calcomBookingUid: data.calcomBookingUid,
      })
      logger.info('Mentor payout evaluated', {
        paymentId: data.paymentId,
        skipped: result.skipped ?? false,
        reason: result.reason,
        transferId: result.transferId,
      })
      return result
    })

    if (!result.success) throw new Error(result.error ?? 'Mentor payout failed')

    if (result.nextAttemptAt) {
      await step.sendEvent('reschedule-recomputed-payout-window', {
        id: `mentor-payout-${data.paymentId}-${data.calcomBookingUid}-${new Date(
          result.nextAttemptAt
        ).getTime()}-recomputed`,
        name: 'payment/mentor-payout.scheduled',
        data: {
          paymentId: data.paymentId,
          calcomBookingUid: data.calcomBookingUid,
          payoutEligibleAt: result.nextAttemptAt,
        },
      })
    }

    return result
  }
)

/** Hourly safety net for missed, delayed, or manually released payout events. */
export const reconcileEligibleMentorPayouts = inngest.createFunction(
  {
    id: 'reconcile-eligible-mentor-payouts',
    name: 'Reconcile Eligible Mentor Payouts',
    triggers: { cron: '15 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const candidates = await step.run('load-due-mentor-payouts', () =>
      db
        .select({
          paymentId: payment.id,
          calcomBookingUid: booking.calcomUid,
          payoutEligibleAt: payment.disputePeriodEnds,
        })
        .from(payment)
        .innerJoin(booking, eq(booking.paymentId, payment.id))
        .where(
          and(
            eq(payment.platformStatus, 'SUCCEEDED'),
            eq(payment.disputeRequested, false),
            eq(payment.requiresManualReview, false),
            lte(payment.disputePeriodEnds, new Date()),
            or(
              isNull(payment.transferId),
              eq(payment.transferStatus, 'reversed'),
              eq(payment.transferStatus, 'failed')
            ),
            or(
              eq(booking.status, 'COMPLETED'),
              and(eq(booking.status, 'ACCEPTED'), lte(booking.endTime, new Date())),
              and(
                eq(booking.status, 'NO_SHOW'),
                eq(booking.attendeeNoShow, true),
                eq(booking.hostNoShow, false)
              ),
              and(eq(booking.status, 'CANCELLED'), eq(booking.mentorPayoutEligible, true))
            )
          )
        )
        .limit(100)
    )

    if (candidates.length === 0) return { queued: 0 }

    await step.sendEvent(
      'queue-reconciled-mentor-payouts',
      candidates.map(candidate => ({
        id: `payout-reconcile-${candidate.paymentId}-${candidate.calcomBookingUid}`,
        name: 'payment/mentor-payout.scheduled' as const,
        data: {
          paymentId: candidate.paymentId,
          calcomBookingUid: candidate.calcomBookingUid,
          payoutEligibleAt: new Date(candidate.payoutEligibleAt).toISOString(),
        },
      }))
    )

    return { queued: candidates.length }
  }
)
