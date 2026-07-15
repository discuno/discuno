import crypto from 'crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '~/env'
import { inngest } from '~/inngest/client'
import { getCalcomBooking } from '~/lib/calcom'
import {
  createCalcomWebhookBookingAuditSnapshot,
  type CalcomBookingWebhookTrigger,
} from '~/lib/calcom/booking-audit'
import { paidCalcomBookingMatchesCheckout } from '~/lib/calcom/paid-booking-attestation'
import { decryptCalcomToken } from '~/lib/calcom/token-crypto'
import { hashCalcomWebhookRouteKey } from '~/lib/calcom/webhooks'
import { trackServerEvent } from '~/lib/posthog-server'
import {
  CalcomBookingCancelledPayloadSchema,
  CalcomBookingPayloadSchema,
  CalcomBookingRescheduledPayloadSchema,
  CalcomNoShowPayloadSchema,
  CalcomNoShowUpdatedPayloadSchema,
  CalcomWebhookEnvelopeSchema,
  type CalcomBookingPayload,
} from '~/lib/schemas/calcom'
import {
  createLocalBooking,
  getLocalBookingLifecycleContext,
  recordLocalBookingLifecycle,
} from '~/lib/services/booking-service'
import { getUserIdByCalcomUserId } from '~/lib/services/calcom-tokens-service'
import {
  scheduleMentorPayout,
  updatePaymentPayoutEligibility,
  withPaymentOperationLock,
} from '~/lib/services/payment-service'
import { shouldAutomaticallyRefundCancellation } from '~/lib/stripe/marketplace'
import { createAnalyticsEvent } from '~/server/dal/analytics'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'
import { db } from '~/server/db'
import { booking, calcomToken, calcomWebhookInbox, payment } from '~/server/db/schema'

const MAX_CALCOM_WEBHOOK_BYTES = 1024 * 1024

const PaidCheckoutSnapshotSchema = z.object({
  checkoutSessionMetadata: z.object({
    mentorUserId: z.uuid(),
    actorUserId: z.uuid(),
    attendeeEmail: z.email(),
    eventTypeId: z.string().regex(/^\d+$/),
    startTime: z.iso.datetime(),
    eventDurationMinutes: z.string().regex(/^\d+$/),
  }),
})

type MentorMetadataPayload = Partial<CalcomBookingPayload> & {
  uid: string
  metadata: { mentorUserId: string; actorUserId?: string }
}

type CancellationActor = 'host' | 'attendee' | 'unknown'
export type CalcomWebhookProcessingContext = {
  expectedMentorUserId: string
  expectedCalcomUserId: number
}

const WEBHOOK_ROUTE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/

const verifyWebhookSignature = (body: Uint8Array, signature: string, secret: string) => {
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')
  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  )
}

const getPayloadConnectionClaims = (
  payload: unknown
): { calcomUserId?: number; mentorUserId?: string } => {
  if (!payload || typeof payload !== 'object') return {}
  const candidate = payload as {
    organizer?: { id?: unknown }
    metadata?: { mentorUserId?: unknown }
  }
  return {
    ...(typeof candidate.organizer?.id === 'number'
      ? { calcomUserId: candidate.organizer.id }
      : {}),
    ...(typeof candidate.metadata?.mentorUserId === 'string'
      ? { mentorUserId: candidate.metadata.mentorUserId }
      : {}),
  }
}

const getConnectionByRouteKey = async (
  routeKey: string
): Promise<{ context: CalcomWebhookProcessingContext; secret: string } | null> => {
  const [connection] = await db
    .select({
      userId: calcomToken.userId,
      calcomUserId: calcomToken.calcomUserId,
      webhookSecret: calcomToken.webhookSecret,
    })
    .from(calcomToken)
    .where(
      and(
        eq(calcomToken.webhookRouteKeyHash, hashCalcomWebhookRouteKey(routeKey)),
        eq(calcomToken.authMode, 'oauth'),
        isNull(calcomToken.disconnectedAt)
      )
    )
    .limit(1)
  if (!connection?.webhookSecret) return null
  return {
    context: {
      expectedMentorUserId: connection.userId,
      expectedCalcomUserId: connection.calcomUserId,
    },
    secret: decryptCalcomToken(connection.webhookSecret, connection.userId),
  }
}

const resolveLegacyConnection = async (
  payload: unknown
): Promise<CalcomWebhookProcessingContext | null> => {
  const claims = getPayloadConnectionClaims(payload)
  if (claims.calcomUserId === undefined) return null
  const [connection] = await db
    .select({ userId: calcomToken.userId, calcomUserId: calcomToken.calcomUserId })
    .from(calcomToken)
    .where(
      and(eq(calcomToken.calcomUserId, claims.calcomUserId), isNull(calcomToken.disconnectedAt))
    )
    .limit(1)
  if (!connection || (claims.mentorUserId && claims.mentorUserId !== connection.userId)) return null
  return {
    expectedMentorUserId: connection.userId,
    expectedCalcomUserId: connection.calcomUserId,
  }
}

const classifyCancellationActor = ({
  email,
  hostEmails,
  attendeeEmails,
}: {
  email?: string | null
  hostEmails: string[]
  attendeeEmails: string[]
}): CancellationActor => {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return 'unknown'
  if (hostEmails.some(candidate => candidate.trim().toLowerCase() === normalized)) return 'host'
  if (attendeeEmails.some(candidate => candidate.trim().toLowerCase() === normalized)) {
    return 'attendee'
  }
  return 'unknown'
}

const earliestProviderConfirmedEventTime = (
  providerUpdatedAt: string,
  envelopeCreatedAt?: string
): Date => {
  const providerTime = new Date(providerUpdatedAt)
  const envelopeTime = envelopeCreatedAt ? new Date(envelopeCreatedAt) : providerTime
  return new Date(Math.min(providerTime.getTime(), envelopeTime.getTime()))
}

const hasMentorMetadata = (data: unknown): data is MentorMetadataPayload => {
  if (typeof data !== 'object' || data === null) return false
  if (!('metadata' in data)) return false
  const metadata = (data as { metadata?: unknown }).metadata
  if (!metadata || typeof metadata !== 'object') return false
  return (
    typeof (data as { uid?: unknown }).uid === 'string' &&
    typeof (metadata as { mentorUserId?: unknown }).mentorUserId === 'string'
  )
}

const getBookingIdentity = (data: unknown): { uid: string; bookingId?: number } | null => {
  if (typeof data !== 'object' || data === null) return null
  const candidate = data as { uid?: unknown; bookingUid?: unknown; bookingId?: unknown }
  const uid =
    typeof candidate.uid === 'string'
      ? candidate.uid
      : typeof candidate.bookingUid === 'string'
        ? candidate.bookingUid
        : null
  if (!uid) return null
  return {
    uid,
    ...(typeof candidate.bookingId === 'number' ? { bookingId: candidate.bookingId } : {}),
  }
}

const getOrganizerCalcomUserId = (data: unknown): number | undefined => {
  if (typeof data !== 'object' || data === null || !('organizer' in data)) return undefined
  const organizer = (data as { organizer?: unknown }).organizer
  if (typeof organizer !== 'object' || organizer === null) return undefined
  const id = (organizer as { id?: unknown }).id
  return typeof id === 'number' ? id : undefined
}

const resolveLifecycleContext = async ({
  processingContext,
  calcomBookingUid,
  organizerCalcomUserId,
}: {
  processingContext?: CalcomWebhookProcessingContext
  calcomBookingUid: string
  organizerCalcomUserId?: number
}): Promise<CalcomWebhookProcessingContext | null> => {
  if (processingContext) {
    if (organizerCalcomUserId !== undefined) {
      return processingContext.expectedCalcomUserId === organizerCalcomUserId
        ? processingContext
        : null
    }

    // Organizer-less no-show/meeting events do not prove that an arbitrary UID
    // belongs to the routed mentor. Only accept them once a tenant-owned local
    // booking/lifecycle row establishes that binding; otherwise a mentor who
    // knows their own secret could preempt another tenant's future UID.
    const localContext = await getLocalBookingLifecycleContext(calcomBookingUid)
    return localContext?.expectedMentorUserId === processingContext.expectedMentorUserId &&
      localContext.expectedCalcomUserId === processingContext.expectedCalcomUserId
      ? processingContext
      : null
  }

  if (organizerCalcomUserId !== undefined) {
    const mentorUserId = await getUserIdByCalcomUserId(organizerCalcomUserId)
    return mentorUserId
      ? {
          expectedMentorUserId: mentorUserId,
          expectedCalcomUserId: organizerCalcomUserId,
        }
      : null
  }

  return getLocalBookingLifecycleContext(calcomBookingUid)
}

const readWebhookBody = async (request: Request): Promise<Uint8Array | null> => {
  const declaredSize = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_CALCOM_WEBHOOK_BYTES) return null
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > MAX_CALCOM_WEBHOOK_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-cal-signature-256') ?? ''
  const routeKey = new URL(req.url).searchParams.get('connection')
  if (routeKey && !WEBHOOK_ROUTE_KEY_PATTERN.test(routeKey)) {
    return Response.json({ error: 'Invalid webhook route' }, { status: 400 })
  }

  let routedConnection: Awaited<ReturnType<typeof getConnectionByRouteKey>> = null
  if (routeKey) {
    try {
      routedConnection = await getConnectionByRouteKey(routeKey)
    } catch (error) {
      console.error('Failed to resolve Cal.com webhook connection', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
      return Response.json({ error: 'Invalid webhook route' }, { status: 400 })
    }
    if (!routedConnection) {
      return Response.json({ error: 'Invalid webhook route' }, { status: 400 })
    }
  } else if (!env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS) {
    return Response.json({ error: 'Legacy webhook route retired' }, { status: 410 })
  }
  let bodyBytes: Uint8Array | null
  try {
    bodyBytes = await readWebhookBody(req)
  } catch (error) {
    console.error('Failed to read Cal.com webhook body', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!bodyBytes) {
    return Response.json({ error: 'Payload too large' }, { status: 413 })
  }

  // Route-scoped secrets isolate mentors. The shared env secret remains only
  // for deliveries from webhooks created before the migration.
  const verificationSecret = routedConnection?.secret ?? env.CALCOM_WEBHOOK_SECRET
  if (!verificationSecret) {
    console.error('Cal.com legacy webhook verification is not configured')
    return Response.json({ error: 'Webhook verification unavailable' }, { status: 503 })
  }
  if (!verifyWebhookSignature(bodyBytes, signature, verificationSecret)) {
    console.error('❌ Webhook signature verification failed for Cal.com payload')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let bodyText: string
  try {
    bodyText = new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes)
  } catch (error) {
    console.error('Failed to decode Cal.com webhook body', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  let rawEvent: unknown
  try {
    rawEvent = JSON.parse(bodyText)
  } catch (error) {
    console.error('Failed to parse Cal.com webhook payload', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const parsedEnvelope = CalcomWebhookEnvelopeSchema.safeParse(rawEvent)
  if (!parsedEnvelope.success) {
    console.error('Invalid Cal.com webhook envelope')
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const payload = parsedEnvelope.data.payload ?? rawEvent
  let connectionContext = routedConnection?.context ?? null
  if (connectionContext) {
    const claims = getPayloadConnectionClaims(payload)
    if (
      (claims.calcomUserId !== undefined &&
        claims.calcomUserId !== connectionContext.expectedCalcomUserId) ||
      (claims.mentorUserId !== undefined &&
        claims.mentorUserId !== connectionContext.expectedMentorUserId)
    ) {
      return Response.json({ error: 'Webhook connection mismatch' }, { status: 400 })
    }
  } else {
    connectionContext = await resolveLegacyConnection(payload)
  }

  const dedupeHash = crypto.createHash('sha256')
  dedupeHash.update(connectionContext?.expectedMentorUserId ?? 'legacy-unbound')
  dedupeHash.update('\0')
  dedupeHash.update(bodyBytes)
  const dedupeKey = dedupeHash.digest('hex')
  const eventCreatedAt = parsedEnvelope.data.createdAt
    ? new Date(parsedEnvelope.data.createdAt)
    : null
  const [inserted] = await db
    .insert(calcomWebhookInbox)
    .values({
      dedupeKey,
      triggerEvent: parsedEnvelope.data.triggerEvent,
      connectionUserId: connectionContext?.expectedMentorUserId ?? null,
      calcomUserId: connectionContext?.expectedCalcomUserId ?? null,
      payload: rawEvent as Record<string, unknown>,
      eventCreatedAt,
    })
    .onConflictDoNothing({ target: calcomWebhookInbox.dedupeKey })
    .returning({
      id: calcomWebhookInbox.id,
      processedAt: calcomWebhookInbox.processedAt,
      quarantinedAt: calcomWebhookInbox.quarantinedAt,
    })

  const inboxRecord =
    inserted ??
    (
      await db
        .select({
          id: calcomWebhookInbox.id,
          processedAt: calcomWebhookInbox.processedAt,
          quarantinedAt: calcomWebhookInbox.quarantinedAt,
        })
        .from(calcomWebhookInbox)
        .where(eq(calcomWebhookInbox.dedupeKey, dedupeKey))
        .limit(1)
    )[0]

  if (!inboxRecord) {
    return Response.json({ error: 'Failed to persist webhook' }, { status: 500 })
  }
  if (inboxRecord.processedAt) {
    return Response.json({ received: true, duplicate: true })
  }
  if (inboxRecord.quarantinedAt) {
    return Response.json({ received: true, duplicate: true, quarantined: true })
  }

  try {
    await inngest.send({
      id: `calcom-webhook-${inboxRecord.id}`,
      name: 'calcom/webhook.received',
      data: { inboxId: inboxRecord.id },
    })
    await db
      .update(calcomWebhookInbox)
      .set({ queuedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(calcomWebhookInbox.id, inboxRecord.id), isNull(calcomWebhookInbox.queuedAt)))
  } catch (error) {
    console.error('Failed to queue persisted Cal.com webhook', {
      inboxId: inboxRecord.id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'Webhook queue unavailable' }, { status: 500 })
  }

  return Response.json({ received: true })
}

/** Process one payload loaded from the durable inbox. */
export async function processCalcomWebhookEvent(
  rawEvent: unknown,
  processingContext?: CalcomWebhookProcessingContext
) {
  const parsedEnvelope = CalcomWebhookEnvelopeSchema.safeParse(rawEvent)
  if (!parsedEnvelope.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { triggerEvent, createdAt } = parsedEnvelope.data
  const payload = parsedEnvelope.data.payload ?? rawEvent
  if (processingContext) {
    const claims = getPayloadConnectionClaims(payload)
    if (
      (claims.calcomUserId !== undefined &&
        claims.calcomUserId !== processingContext.expectedCalcomUserId) ||
      (claims.mentorUserId !== undefined &&
        claims.mentorUserId !== processingContext.expectedMentorUserId)
    ) {
      return Response.json({ error: 'Webhook connection mismatch' }, { status: 400 })
    }
  }
  console.log('Received Cal.com webhook event', { triggerEvent })

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        return await storeBooking(payload, createdAt, processingContext, {
          triggerEvent: 'BOOKING_CREATED',
        })
      case 'BOOKING_REJECTED':
        return await storeBooking(payload, createdAt, processingContext, {
          triggerEvent: 'BOOKING_REJECTED',
        })
      case 'BOOKING_RESCHEDULED': {
        if (!createdAt) {
          return Response.json(
            { error: 'BOOKING_RESCHEDULED is missing its event timestamp' },
            { status: 422 }
          )
        }
        const rescheduledBooking = CalcomBookingRescheduledPayloadSchema.parse(payload)
        const lifecycleContext = await resolveLifecycleContext({
          processingContext,
          calcomBookingUid: rescheduledBooking.rescheduleUid,
          organizerCalcomUserId: rescheduledBooking.organizer.id,
        })
        if (!lifecycleContext) {
          console.log('Ignored a reschedule outside the verified Discuno Cal.com connection')
          break
        }
        return await storeBooking(rescheduledBooking, createdAt, lifecycleContext, {
          triggerEvent: 'BOOKING_RESCHEDULED',
          rescheduledFromUid: rescheduledBooking.rescheduleUid,
        })
      }
      // Guest didn't show up
      case 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW':
        {
          if (!createdAt) {
            return Response.json(
              { error: 'Guest no-show event is missing its event timestamp' },
              { status: 422 }
            )
          }
          const noShow = CalcomNoShowPayloadSchema.parse(payload)
          const { bookingUid } = noShow
          const lifecycleContext = await resolveLifecycleContext({
            processingContext,
            calcomBookingUid: bookingUid,
          })
          if (!lifecycleContext) {
            console.log('Ignored an unknown global Cal.com attendee no-show')
            break
          }
          const result = await recordLocalBookingLifecycle({
            calcomUid: bookingUid,
            calcomBookingId: noShow.bookingId,
            mentorUserId: lifecycleContext.expectedMentorUserId,
            calcomUserId: lifecycleContext.expectedCalcomUserId,
            state: 'ATTENDEE_NO_SHOW',
            financialDisposition: 'PAYOUT_ATTENDEE_NO_SHOW',
            eventCreatedAt: new Date(createdAt),
          })
          console.log(
            result.missing
              ? 'Stored attendee no-show until its booking snapshot arrives'
              : 'Marked Cal.com booking attendee as a no-show'
          )
        }
        break
      // Host didn't show up - attempt to mark and potentially refund
      case 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW':
        {
          if (!createdAt) {
            return Response.json(
              { error: 'Host no-show event is missing its event timestamp' },
              { status: 422 }
            )
          }
          const noShow = CalcomNoShowPayloadSchema.parse(payload)
          const { bookingUid } = noShow
          const lifecycleContext = await resolveLifecycleContext({
            processingContext,
            calcomBookingUid: bookingUid,
          })
          if (!lifecycleContext) {
            console.log('Ignored an unknown global Cal.com host no-show')
            break
          }
          const providerBooking = await getCalcomBooking(
            bookingUid,
            lifecycleContext.expectedMentorUserId
          )
          if (
            providerBooking.uid !== bookingUid ||
            providerBooking.id !== noShow.bookingId ||
            providerBooking.status.toLowerCase() !== 'accepted' ||
            providerBooking.absentHost !== true ||
            providerBooking.metadata.mentorUserId !== lifecycleContext.expectedMentorUserId
          ) {
            throw new Error('Cal.com does not confirm the host no-show')
          }

          if (typeof providerBooking.metadata.paymentId === 'string') {
            const providerPaymentId = Number(providerBooking.metadata.paymentId)
            const [paidBooking] = Number.isSafeInteger(providerPaymentId)
              ? await db
                  .select({
                    mentorUserId: payment.mentorUserId,
                    customerEmail: payment.customerEmail,
                    calcomBookingUid: payment.calcomBookingUid,
                    metadata: payment.metadata,
                  })
                  .from(payment)
                  .where(eq(payment.id, providerPaymentId))
                  .limit(1)
              : []
            const checkoutSnapshot = PaidCheckoutSnapshotSchema.safeParse(paidBooking?.metadata)
            const checkout = checkoutSnapshot.success
              ? checkoutSnapshot.data.checkoutSessionMetadata
              : null
            const providerRescheduledFromUid = providerBooking.rescheduledFromUid?.trim()
            const rescheduledFromUid = providerRescheduledFromUid?.length
              ? providerRescheduledFromUid
              : null
            const [recognizedPredecessor] = rescheduledFromUid
              ? await db
                  .select({ id: booking.id })
                  .from(booking)
                  .where(
                    and(
                      eq(booking.paymentId, providerPaymentId),
                      eq(booking.calcomUid, rescheduledFromUid),
                      eq(booking.status, 'CANCELLED'),
                      eq(booking.mentorPayoutEligible, false)
                    )
                  )
                  .limit(1)
              : []
            if (
              !paidBooking ||
              !checkout ||
              paidBooking.mentorUserId !== lifecycleContext.expectedMentorUserId ||
              paidBooking.calcomBookingUid !== bookingUid ||
              paidBooking.customerEmail.toLowerCase() !== checkout.attendeeEmail.toLowerCase() ||
              (rescheduledFromUid !== null && !recognizedPredecessor) ||
              !paidCalcomBookingMatchesCheckout({
                booking: providerBooking,
                checkout,
                paymentId: providerPaymentId,
                expectedUid: bookingUid,
                expectedBookingId: noShow.bookingId,
                expectedCurrentStart: new Date(providerBooking.start),
                rescheduledFromUid,
              })
            ) {
              throw new Error('Cal.com host no-show conflicts with its paid Checkout snapshot')
            }
          }
          const result = await recordLocalBookingLifecycle({
            calcomUid: bookingUid,
            calcomBookingId: noShow.bookingId,
            mentorUserId: lifecycleContext.expectedMentorUserId,
            calcomUserId: lifecycleContext.expectedCalcomUserId,
            state: 'HOST_NO_SHOW',
            financialDisposition: 'REFUND_MENTOR_NO_SHOW',
            eventCreatedAt: new Date(providerBooking.updatedAt),
          })
          if (result.missing) {
            console.warn('Stored host no-show until its booking snapshot arrives')
          }
        }
        break
      case 'BOOKING_NO_SHOW_UPDATED': {
        if (!createdAt) {
          return Response.json(
            { error: 'No-show update is missing its event timestamp' },
            { status: 422 }
          )
        }
        const noShow = CalcomNoShowUpdatedPayloadSchema.parse(payload)
        const lifecycleContext = await resolveLifecycleContext({
          processingContext,
          calcomBookingUid: noShow.bookingUid,
        })
        if (!lifecycleContext) {
          console.log('Ignored an unknown global Cal.com no-show update')
          break
        }
        const attendeeNoShow = noShow.attendees.some(attendee => attendee.noShow)
        const result = await recordLocalBookingLifecycle({
          calcomUid: noShow.bookingUid,
          calcomBookingId: noShow.bookingId,
          mentorUserId: lifecycleContext.expectedMentorUserId,
          calcomUserId: lifecycleContext.expectedCalcomUserId,
          state: attendeeNoShow ? 'ATTENDEE_NO_SHOW' : 'ACTIVE',
          financialDisposition: attendeeNoShow ? 'PAYOUT_ATTENDEE_NO_SHOW' : 'NONE',
          eventCreatedAt: new Date(createdAt),
        })
        if (result.missing) {
          console.warn('Stored no-show update until its booking snapshot arrives')
        }
        break
      }
      case 'RECORDING_TRANSCRIPTION_GENERATED':
        console.log('Cal.com transcription generated')
        break
      case 'RECORDING_READY':
        console.log('Cal.com recording ready')
        break
      case 'MEETING_STARTED': {
        if (!hasMentorMetadata(payload)) {
          console.warn(`⚠️ MEETING_STARTED event missing payload metadata`)
          break
        }
        const mentorUserId = payload.metadata.mentorUserId
        try {
          await trackServerEvent(mentorUserId, 'meeting_started', {
            calcomUid: payload.uid,
            calcomBookingId: payload.bookingId,
            startTime: payload.startTime,
          })
        } catch (error) {
          console.error('Failed to track meeting started event', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          })
        }
        break
      }
      case 'BOOKING_COMPLETED':
      case 'MEETING_ENDED': {
        if (!createdAt) {
          return Response.json(
            { error: 'MEETING_ENDED is missing its event timestamp' },
            { status: 422 }
          )
        }
        const identity = getBookingIdentity(payload)
        if (!identity) {
          return Response.json(
            { error: 'MEETING_ENDED is missing its booking identity' },
            { status: 422 }
          )
        }
        const lifecycleContext = await resolveLifecycleContext({
          processingContext,
          calcomBookingUid: identity.uid,
          organizerCalcomUserId: getOrganizerCalcomUserId(payload),
        })
        if (!lifecycleContext) {
          console.log('Ignored an unknown global Cal.com meeting-end event')
          break
        }
        const completion = await recordLocalBookingLifecycle({
          calcomUid: identity.uid,
          calcomBookingId: identity.bookingId,
          mentorUserId: lifecycleContext.expectedMentorUserId,
          calcomUserId: lifecycleContext.expectedCalcomUserId,
          state: 'COMPLETED',
          financialDisposition: 'PAYOUT_COMPLETED',
          eventCreatedAt: new Date(createdAt),
        })
        if (completion.missing) {
          console.warn('Stored meeting completion until its booking snapshot arrives')
        }
        if (!completion.recorded) {
          console.log('Cal.com meeting end was already handled')
          break
        }

        if (
          hasMentorMetadata(payload) &&
          payload.metadata.mentorUserId === lifecycleContext.expectedMentorUserId
        ) {
          const mentorUserId = lifecycleContext.expectedMentorUserId
          await createAnalyticsEvent({
            eventType: 'COMPLETED_BOOKING',
            targetUserId: mentorUserId,
            actorUserId: payload.metadata.actorUserId ?? null,
          })

          // Track meeting ended in PostHog
          try {
            await trackServerEvent(mentorUserId, 'meeting_ended', {
              calcomUid: payload.uid,
              calcomBookingId: payload.bookingId,
              startTime: payload.startTime,
              endTime: payload.endTime,
            })
          } catch (error) {
            console.error('Failed to track meeting ended event', {
              errorName: error instanceof Error ? error.name : 'UnknownError',
            })
          }
        } else {
          console.warn('MEETING_ENDED did not include mentor metadata; lifecycle was still stored')
        }
        break
      }
      case 'BOOKING_CANCELLED':
        {
          if (!createdAt) {
            return Response.json(
              { error: 'BOOKING_CANCELLED is missing its event timestamp' },
              { status: 422 }
            )
          }
          const cancelledBooking = CalcomBookingCancelledPayloadSchema.parse(payload)
          const lifecycleContext = await resolveLifecycleContext({
            processingContext,
            calcomBookingUid: cancelledBooking.uid,
            organizerCalcomUserId: cancelledBooking.organizer.id,
          })
          if (
            !lifecycleContext ||
            cancelledBooking.metadata.mentorUserId !== lifecycleContext.expectedMentorUserId
          ) {
            console.log('Ignored a cancellation outside the verified Discuno booking context')
            break
          }
          const mentorUserId = lifecycleContext.expectedMentorUserId
          // A tenant-scoped HMAC proves which mentor connection sent the
          // notification, but the mentor can manage that webhook and secret in
          // Cal.com. Re-read the booking before making any financial decision.
          const bookingDetails = await getCalcomBooking(cancelledBooking.uid, mentorUserId)
          const providerStatus = bookingDetails.status.toLowerCase()
          if (!['cancelled', 'rejected'].includes(providerStatus)) {
            throw new Error('Cal.com does not confirm that the booking is cancelled')
          }
          if (bookingDetails.metadata.mentorUserId !== mentorUserId) {
            throw new Error('Cal.com cancellation metadata does not match the Discuno mentor')
          }
          if (
            cancelledBooking.metadata.paymentId &&
            bookingDetails.metadata.paymentId !== cancelledBooking.metadata.paymentId
          ) {
            throw new Error('Cal.com cancellation metadata does not match the Discuno payment')
          }

          // Cal.com cancels the predecessor as part of a reschedule. That is
          // schedule lineage, not a refundable customer cancellation. Verify
          // the successor from the provider before preserving financial NONE.
          if (bookingDetails.rescheduledToUid) {
            const successor = await getCalcomBooking(bookingDetails.rescheduledToUid, mentorUserId)
            if (
              successor.rescheduledFromUid !== cancelledBooking.uid ||
              successor.metadata.mentorUserId !== mentorUserId ||
              successor.metadata.paymentId !== bookingDetails.metadata.paymentId ||
              successor.metadata.actorUserId !== bookingDetails.metadata.actorUserId
            ) {
              throw new Error('Cal.com could not verify the rescheduled booking lineage')
            }
            if (typeof successor.metadata.paymentId === 'string') {
              const providerPaymentId = Number(successor.metadata.paymentId)
              const [paidBooking] = Number.isSafeInteger(providerPaymentId)
                ? await db
                    .select({
                      mentorUserId: payment.mentorUserId,
                      customerEmail: payment.customerEmail,
                      metadata: payment.metadata,
                    })
                    .from(payment)
                    .where(eq(payment.id, providerPaymentId))
                    .limit(1)
                : []
              const checkoutSnapshot = PaidCheckoutSnapshotSchema.safeParse(paidBooking?.metadata)
              const checkout = checkoutSnapshot.success
                ? checkoutSnapshot.data.checkoutSessionMetadata
                : null
              if (
                !paidBooking ||
                !checkout ||
                paidBooking.mentorUserId !== mentorUserId ||
                paidBooking.customerEmail.toLowerCase() !== checkout.attendeeEmail.toLowerCase() ||
                !paidCalcomBookingMatchesCheckout({
                  booking: successor,
                  checkout,
                  paymentId: providerPaymentId,
                  expectedUid: successor.uid,
                  rescheduledFromUid: cancelledBooking.uid,
                })
              ) {
                throw new Error('Cal.com reschedule conflicts with its paid Checkout snapshot')
              }
            }
            await recordLocalBookingLifecycle({
              calcomUid: cancelledBooking.uid,
              calcomBookingId: bookingDetails.id,
              mentorUserId,
              calcomUserId: lifecycleContext.expectedCalcomUserId,
              state: 'CANCELLED',
              financialDisposition: 'NONE',
              mentorPayoutEligible: false,
              eventCreatedAt: new Date(bookingDetails.updatedAt),
            })
            break
          }

          if (typeof bookingDetails.metadata.paymentId === 'string') {
            const providerPaymentId = Number(bookingDetails.metadata.paymentId)
            const [paidBooking] = Number.isSafeInteger(providerPaymentId)
              ? await db
                  .select({
                    mentorUserId: payment.mentorUserId,
                    customerEmail: payment.customerEmail,
                    calcomBookingUid: payment.calcomBookingUid,
                    metadata: payment.metadata,
                  })
                  .from(payment)
                  .where(eq(payment.id, providerPaymentId))
                  .limit(1)
              : []
            const checkoutSnapshot = PaidCheckoutSnapshotSchema.safeParse(paidBooking?.metadata)
            const checkout = checkoutSnapshot.success
              ? checkoutSnapshot.data.checkoutSessionMetadata
              : null
            const providerRescheduledFromUid = bookingDetails.rescheduledFromUid?.trim()
            const rescheduledFromUid = providerRescheduledFromUid?.length
              ? providerRescheduledFromUid
              : null
            const [recognizedPredecessor] = rescheduledFromUid
              ? await db
                  .select({ id: booking.id })
                  .from(booking)
                  .where(
                    and(
                      eq(booking.paymentId, providerPaymentId),
                      eq(booking.calcomUid, rescheduledFromUid),
                      eq(booking.status, 'CANCELLED'),
                      eq(booking.mentorPayoutEligible, false)
                    )
                  )
                  .limit(1)
              : []
            if (
              !paidBooking ||
              !checkout ||
              paidBooking.mentorUserId !== mentorUserId ||
              paidBooking.calcomBookingUid !== cancelledBooking.uid ||
              paidBooking.customerEmail.toLowerCase() !== checkout.attendeeEmail.toLowerCase() ||
              (rescheduledFromUid !== null && !recognizedPredecessor) ||
              !paidCalcomBookingMatchesCheckout({
                booking: bookingDetails,
                checkout,
                paymentId: providerPaymentId,
                expectedUid: cancelledBooking.uid,
                expectedBookingId: bookingDetails.id,
                expectedCurrentStart: new Date(bookingDetails.start),
                rescheduledFromUid,
              })
            ) {
              throw new Error('Cal.com cancellation conflicts with its paid Checkout snapshot')
            }
          }

          // Cal has no dedicated cancelledAt field. Bind status/actor to the
          // authenticated provider read, then preserve the earlier of its
          // generic updatedAt and the signed notification time. A mentor-owned
          // webhook can only move this earlier (toward a customer refund), never
          // later toward a mentor payout. The lifecycle keeps this first value.
          const cancellationTime = earliestProviderConfirmedEventTime(
            bookingDetails.updatedAt,
            createdAt
          )
          const providerHostEmails = bookingDetails.hosts.map(host => host.email)
          const providerAttendeeEmails = bookingDetails.attendees.map(attendee => attendee.email)
          const cancelledByEmail = bookingDetails.cancelledByEmail ?? null
          const cancellationActor =
            providerStatus === 'rejected'
              ? ('host' as const)
              : classifyCancellationActor({
                  email: cancelledByEmail,
                  hostEmails: providerHostEmails,
                  attendeeEmails: providerAttendeeEmails,
                })
          const earlyCancellation = shouldAutomaticallyRefundCancellation({
            cancelledByEmail,
            organizerEmail: providerHostEmails[0] ?? cancelledBooking.organizer.email,
            startTime: bookingDetails.start,
            now: cancellationTime,
          })

          const shouldRefund = earlyCancellation || cancellationActor === 'host'
          const requiresManualReview = !earlyCancellation && cancellationActor === 'unknown'
          const mentorPayoutEligible = !shouldRefund && !requiresManualReview
          const financialDisposition = requiresManualReview
            ? ('HOLD_LATE_CANCELLATION' as const)
            : cancellationActor === 'host'
              ? ('REFUND_MENTOR_CANCELLATION' as const)
              : earlyCancellation
                ? ('REFUND_EARLY_CANCELLATION' as const)
                : ('PAYOUT_LATE_CANCELLATION' as const)
          const cancellation = await recordLocalBookingLifecycle({
            calcomUid: cancelledBooking.uid,
            calcomBookingId: bookingDetails.id,
            mentorUserId: lifecycleContext.expectedMentorUserId,
            calcomUserId: lifecycleContext.expectedCalcomUserId,
            state: 'CANCELLED',
            financialDisposition,
            mentorPayoutEligible,
            eventCreatedAt: cancellationTime,
          })
          if (cancellation.missing) {
            console.warn('Stored cancellation until its booking snapshot arrives')
          }
          if (!cancellation.recorded) {
            console.log('Cal.com cancellation was already handled')
          }

          if (cancellation.recorded) {
            const actorUserId =
              cancellationActor === 'host'
                ? mentorUserId
                : (cancelledBooking.metadata.actorUserId ?? null)
            await createAnalyticsEvent({
              eventType: 'CANCELLED_BOOKING',
              targetUserId: mentorUserId,
              actorUserId,
            })

            // Track booking cancellation in PostHog
            try {
              await trackServerEvent(mentorUserId, 'booking_cancelled', {
                calcomUid: cancelledBooking.uid,
                calcomBookingId: cancelledBooking.bookingId,
              })
            } catch (error) {
              console.error('Failed to track booking cancellation event', {
                errorName: error instanceof Error ? error.name : 'UnknownError',
              })
            }
          }
        }
        break
      default:
        console.log(`ℹ️ Unhandled webhook event type: ${triggerEvent}`)
        break
    }
  } catch (error) {
    console.error(`Error processing webhook event ${triggerEvent}`, {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json(
      {
        error:
          error instanceof z.ZodError ? 'Invalid webhook payload' : 'Failed to process webhook',
      },
      { status: error instanceof z.ZodError ? 422 : 500 }
    )
  }

  return Response.json({ received: true })
}

async function storeBooking(
  event: unknown,
  eventCreatedAt: string | undefined,
  processingContext: CalcomWebhookProcessingContext | undefined,
  options: {
    triggerEvent: CalcomBookingWebhookTrigger
    rescheduledFromUid?: string
    paymentLockHeld?: boolean
  }
): Promise<Response> {
  console.log('Processing Cal.com BOOKING_CREATED event...')
  try {
    const validation = CalcomBookingPayloadSchema.safeParse(event)
    if (!validation.success) {
      console.warn('Invalid Cal.com booking payload')
      return Response.json({ error: 'Invalid booking payload' }, { status: 400 })
    }

    const {
      bookingId,
      uid,
      title,
      attendees,
      startTime,
      length,
      organizer,
      eventTypeId,
      metadata,
      status,
    } = validation.data
    let authoritativeStatus = status
    let authoritativeLifecycleEventCreatedAt = eventCreatedAt
    let authoritativeSupersededByUid: string | undefined

    const [attendee] = attendees

    // Validation ensures at least one attendee exists
    if (!attendee) {
      return Response.json({ error: 'No attendee found in booking' }, { status: 400 })
    }

    const paymentId = metadata.paymentId ? Number(metadata.paymentId) : null
    if (metadata.paymentId && (!Number.isSafeInteger(paymentId) || (paymentId ?? 0) <= 0)) {
      return Response.json({ error: 'Invalid booking payment identity' }, { status: 400 })
    }
    if (paymentId && !options.paymentLockHeld) {
      return withPaymentOperationLock(paymentId, () =>
        storeBooking(event, eventCreatedAt, processingContext, {
          ...options,
          paymentLockHeld: true,
        })
      )
    }

    const start = new Date(startTime)
    let attendeeUserId: string | null = null
    if (metadata.actorUserId) {
      try {
        attendeeUserId = await resolveCanonicalUserId(metadata.actorUserId)
      } catch (error) {
        console.error('Could not resolve Cal.com booking attendee identity', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      }
    }
    const organizerUserId = await getUserIdByCalcomUserId(organizer.id)
    if (!organizerUserId || organizerUserId !== metadata.mentorUserId) {
      return Response.json(
        { error: 'Booking organizer does not match Discuno mentor' },
        { status: 400 }
      )
    }
    if (
      processingContext &&
      (processingContext.expectedMentorUserId !== organizerUserId ||
        processingContext.expectedCalcomUserId !== organizer.id)
    ) {
      return Response.json(
        { error: 'Booking does not belong to this Cal.com connection' },
        { status: 400 }
      )
    }

    if (paymentId) {
      const [paidBooking] = await db
        .select({
          mentorUserId: payment.mentorUserId,
          customerEmail: payment.customerEmail,
          calcomBookingUid: payment.calcomBookingUid,
          platformStatus: payment.platformStatus,
          metadata: payment.metadata,
        })
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1)
      const checkoutSnapshot = PaidCheckoutSnapshotSchema.safeParse(paidBooking?.metadata)
      const checkout = checkoutSnapshot.success
        ? checkoutSnapshot.data.checkoutSessionMetadata
        : null
      const providerBooking = checkout ? await getCalcomBooking(uid, organizerUserId) : null
      const paidBookingMatches =
        paidBooking &&
        (paidBooking.platformStatus === 'SUCCEEDED' ||
          (paidBooking.platformStatus === 'TRANSFERRED' && paidBooking.calcomBookingUid === uid)) &&
        checkout &&
        providerBooking &&
        paidBooking.mentorUserId === organizerUserId &&
        checkout.mentorUserId === organizerUserId &&
        checkout.actorUserId === metadata.actorUserId &&
        checkout.attendeeEmail.toLowerCase() === attendee.email.toLowerCase() &&
        paidBooking.customerEmail.toLowerCase() === checkout.attendeeEmail.toLowerCase() &&
        Number(checkout.eventTypeId) === eventTypeId &&
        (options.rescheduledFromUid !== undefined ||
          new Date(checkout.startTime).getTime() === start.getTime()) &&
        Number(checkout.eventDurationMinutes) === length &&
        paidCalcomBookingMatchesCheckout({
          booking: providerBooking,
          checkout,
          paymentId,
          expectedUid: uid,
          expectedBookingId: bookingId,
          expectedCurrentStart: start,
          rescheduledFromUid: options.rescheduledFromUid ?? null,
        })
      if (!paidBookingMatches) {
        return Response.json(
          { error: 'Paid booking does not match its Checkout snapshot' },
          { status: 400 }
        )
      }
      const normalizedProviderStatus = providerBooking.status.toUpperCase()
      if (!['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED'].includes(normalizedProviderStatus)) {
        return Response.json({ error: 'Unsupported Cal.com booking status' }, { status: 400 })
      }
      authoritativeStatus = normalizedProviderStatus as typeof authoritativeStatus
      if (authoritativeStatus === 'CANCELLED' || authoritativeStatus === 'REJECTED') {
        authoritativeLifecycleEventCreatedAt = earliestProviderConfirmedEventTime(
          providerBooking.updatedAt,
          eventCreatedAt
        ).toISOString()
      }
      if (providerBooking.rescheduledToUid) {
        const successor = await getCalcomBooking(providerBooking.rescheduledToUid, organizerUserId)
        if (
          !paidCalcomBookingMatchesCheckout({
            booking: successor,
            checkout,
            paymentId,
            expectedUid: successor.uid,
            rescheduledFromUid: uid,
          }) ||
          !['accepted', 'pending'].includes(successor.status.toLowerCase())
        ) {
          throw new Error('Cal.com could not verify the current rescheduled booking')
        }
        authoritativeSupersededByUid = successor.uid
      }
    }

    if (options.rescheduledFromUid) {
      const previousBooking = await recordLocalBookingLifecycle({
        calcomUid: options.rescheduledFromUid,
        mentorUserId: processingContext?.expectedMentorUserId ?? organizerUserId,
        calcomUserId: processingContext?.expectedCalcomUserId ?? organizer.id,
        state: 'CANCELLED',
        financialDisposition: 'NONE',
        mentorPayoutEligible: false,
        eventCreatedAt: authoritativeLifecycleEventCreatedAt
          ? new Date(authoritativeLifecycleEventCreatedAt)
          : new Date(),
      })
      if (previousBooking.missing) {
        console.warn('Stored a lifecycle marker for an original rescheduled booking not yet seen')
      }
    }

    const { booking, lifecycle, created } = await createLocalBooking({
      calcomBookingId: bookingId,
      calcomUid: uid,
      title,
      description: validation.data.description,
      startTime: start,
      duration: length,
      endTime: new Date(start.getTime() + length * 60000),
      meetingUrl: validation.data.metadata.videoCallUrl,
      calcomEventTypeId: eventTypeId,
      calcomUserId: organizer.id,
      paymentId: metadata.paymentId ? Number(metadata.paymentId) : undefined,
      rescheduledFromUid: options.rescheduledFromUid,
      supersededByUid: authoritativeSupersededByUid,
      organizer: {
        userId: organizerUserId,
        email: organizer.email,
        username: organizer.username,
        name: organizer.name,
      },
      attendee: {
        userId: attendeeUserId,
        name: attendee.name,
        email: attendee.email,
        phoneNumber: attendee.phoneNumber,
        timeZone: attendee.timeZone,
      },
      webhookPayload: createCalcomWebhookBookingAuditSnapshot({
        triggerEvent: options.triggerEvent,
        ...(eventCreatedAt ? { eventCreatedAt } : {}),
      }),
      status: authoritativeStatus,
      ...(authoritativeLifecycleEventCreatedAt
        ? { lifecycleEventCreatedAt: new Date(authoritativeLifecycleEventCreatedAt) }
        : {}),
    })

    if (!created) console.log('Cal.com booking was already stored')
    else console.log('Stored Cal.com booking successfully')

    if (
      booking.paymentId &&
      lifecycle.state === 'ACTIVE' &&
      booking.status !== 'CANCELLED' &&
      booking.status !== 'REJECTED'
    ) {
      const payoutEligibleAt = await updatePaymentPayoutEligibility(
        booking.paymentId,
        start,
        length
      )
      await scheduleMentorPayout({
        paymentId: booking.paymentId,
        calcomBookingUid: uid,
        payoutEligibleAt,
        reason: 'cal-booking-stored',
      })
    }

    // Track booking creation in PostHog
    if (created)
      try {
        if (metadata.mentorUserId) {
          await trackServerEvent(metadata.mentorUserId, 'booking_created', {
            bookingId: booking.id,
            calcomBookingId: bookingId,
            calcomUid: uid,
            eventTypeId,
            duration: length,
            startTime: start.toISOString(),
          })
        }
        // Also track for the attendee if we have their user ID
        if (metadata.actorUserId) {
          await trackServerEvent(metadata.actorUserId, 'booking_created', {
            bookingId: booking.id,
            calcomBookingId: bookingId,
            calcomUid: uid,
            eventTypeId,
            duration: length,
            startTime: start.toISOString(),
            mentorUserId: metadata.mentorUserId,
          })
        }
      } catch (error) {
        console.error('Failed to track booking creation event', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      }

    return Response.json(booking, { status: created ? 201 : 200 })
  } catch (error) {
    console.error('Failed to store booking for Cal.com event', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'Failed to process booking' }, { status: 500 })
  }
}
