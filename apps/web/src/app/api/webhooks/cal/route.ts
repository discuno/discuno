import crypto from 'crypto'
import { env } from '~/env'
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
  cancelLocalBooking,
  completeLocalBooking,
  createLocalBooking,
  updateLocalBookingStatus,
} from '~/lib/services/booking-service'
import { getUserIdByCalcomUserId } from '~/lib/services/calcom-tokens-service'
import { createAnalyticsEvent } from '~/server/dal/analytics'

type MentorMetadataPayload = Partial<CalcomBookingPayload> & {
  uid: string
  metadata: { mentorUserId: string; actorUserId?: string }
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

export async function POST(req: Request) {
  const signature = req.headers.get('x-cal-signature-256') ?? ''
  const bodyText = await req.text()

  // Verify signature authenticity
  const expectedSignature = crypto
    .createHmac('sha256', env.CALCOM_WEBHOOK_SECRET)
    .update(bodyText)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    console.error('❌ Webhook signature verification failed for Cal.com payload')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let rawEvent: unknown
  try {
    rawEvent = JSON.parse(bodyText)
  } catch (err) {
    console.error('❌ Failed to parse Cal.com webhook payload:', err)
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const parsedEnvelope = CalcomWebhookEnvelopeSchema.safeParse(rawEvent)
  if (!parsedEnvelope.success) {
    console.error('Invalid Cal.com webhook envelope')
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { triggerEvent } = parsedEnvelope.data
  const payload = parsedEnvelope.data.payload ?? rawEvent
  console.log('Received Cal.com webhook event', { triggerEvent })

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        return await storeBooking(payload)
      case 'BOOKING_RESCHEDULED': {
        const rescheduledBooking = CalcomBookingRescheduledPayloadSchema.parse(payload)
        await cancelLocalBooking(rescheduledBooking.rescheduleUid)
        return await storeBooking(rescheduledBooking)
      }
      // Guest didn't show up
      case 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW':
        {
          const noShow = CalcomNoShowPayloadSchema.parse(payload)
          const { bookingUid } = noShow
          // Only update local database - guest no-show
          await updateLocalBookingStatus(bookingUid, 'NO_SHOW', {
            hostNoShow: false,
            attendeeNoShow: true,
          })
          console.log(`✅ Marked guest as no-show for booking ${bookingUid}`)
        }
        break
      // Host didn't show up - attempt to mark and potentially refund
      case 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW':
        {
          const noShow = CalcomNoShowPayloadSchema.parse(payload)
          const { bookingUid } = noShow

          // Update local database first
          await updateLocalBookingStatus(bookingUid, 'NO_SHOW', {
            hostNoShow: true,
            attendeeNoShow: false,
          })
        }
        break
      case 'BOOKING_NO_SHOW_UPDATED': {
        const noShow = CalcomNoShowUpdatedPayloadSchema.parse(payload)
        const attendeeNoShow = noShow.attendees.some(attendee => attendee.noShow)
        await updateLocalBookingStatus(noShow.bookingUid, attendeeNoShow ? 'NO_SHOW' : 'ACCEPTED', {
          hostNoShow: false,
          attendeeNoShow,
        })
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
          console.error(`❌ Failed to track meeting started event:`, error)
        }
        break
      }
      case 'MEETING_ENDED': {
        if (!hasMentorMetadata(payload)) {
          console.warn(`⚠️ MEETING_ENDED event missing payload metadata`)
          break
        }
        const mentorUserId = payload.metadata.mentorUserId
        const completion = await completeLocalBooking(payload.uid)
        if (!completion.transitioned) {
          console.log(`Cal.com meeting end already handled for booking ${payload.uid}`)
          break
        }

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
          console.error(`❌ Failed to track meeting ended event:`, error)
        }
        break
      }
      case 'BOOKING_CANCELLED':
        {
          const cancelledBooking = CalcomBookingCancelledPayloadSchema.parse(payload)
          const cancellation = await cancelLocalBooking(cancelledBooking.uid)
          if (!cancellation.transitioned) {
            console.log(`Cal.com cancellation already handled for booking ${cancelledBooking.uid}`)
            break
          }
          const mentorUserId = await getUserIdByCalcomUserId(cancelledBooking.organizer.id)
          if (mentorUserId) {
            await createAnalyticsEvent({
              eventType: 'CANCELLED_BOOKING',
              targetUserId: mentorUserId,
              actorUserId: mentorUserId,
            })

            // Track booking cancellation in PostHog
            try {
              await trackServerEvent(mentorUserId, 'booking_cancelled', {
                calcomUid: cancelledBooking.uid,
                calcomBookingId: cancelledBooking.bookingId,
              })
            } catch (error) {
              console.error(`❌ Failed to track booking cancellation event:`, error)
            }
          }
        }
        break
      default:
        console.log(`ℹ️ Unhandled webhook event type: ${triggerEvent}`)
        break
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Error processing webhook event ${triggerEvent}:`, errorMessage)
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 })
  }

  return Response.json({ received: true })
}

async function storeBooking(event: unknown) {
  console.log('Processing Cal.com BOOKING_CREATED event...')
  try {
    const validation = CalcomBookingPayloadSchema.safeParse(event)
    if (!validation.success) {
      console.warn('❌ Invalid Cal.com booking payload:', validation.error.flatten())
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
    } = validation.data

    const [attendee] = attendees

    // Validation ensures at least one attendee exists
    if (!attendee) {
      return Response.json({ error: 'No attendee found in booking' }, { status: 400 })
    }

    const start = new Date(startTime)

    const { booking, created } = await createLocalBooking({
      calcomBookingId: bookingId,
      calcomUid: uid,
      title,
      description: validation.data.description,
      startTime: start,
      duration: length,
      endTime: new Date(start.getTime() + length * 60000),
      meetingUrl: validation.data.metadata.videoCallUrl,
      calcomEventTypeId: eventTypeId,
      paymentId: metadata.paymentId ? Number(metadata.paymentId) : undefined,
      organizer: {
        userId: metadata.mentorUserId,
        email: organizer.email,
        username: organizer.username,
        name: organizer.name,
      },
      attendee: {
        name: attendee.name,
        email: attendee.email,
        phoneNumber: attendee.phoneNumber,
        timeZone: attendee.timeZone,
      },
      webhookPayload: validation.data,
    })

    if (!created) {
      console.log(`Cal.com booking ${uid} was already stored`)
      return Response.json(booking)
    }

    console.log(`✅ Successfully stored booking ${booking.id} for Cal.com event ${uid}`)

    // Track booking creation in PostHog
    try {
      if (metadata.mentorUserId) {
        await trackServerEvent(metadata.mentorUserId, 'booking_created', {
          bookingId: booking.id,
          calcomBookingId: bookingId,
          calcomUid: uid,
          eventTypeId,
          duration: length,
          startTime: start.toISOString(),
          attendeeEmail: attendee.email,
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
      console.error(`❌ Failed to track booking creation event:`, error)
    }

    return Response.json(booking, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to store booking for Cal.com event:`, errorMessage)
    return Response.json({ error: 'Failed to process booking' }, { status: 500 })
  }
}
