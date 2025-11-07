import crypto from 'crypto'
import { env } from '~/env'
import { markAsNoShow } from '~/lib/calcom'
import { logger } from '~/lib/logger'
import {
  CalcomBookingPayloadSchema,
  type CalcomBookingPayload,
  type CalcomWebhookEvent,
} from '~/lib/schemas/calcom'
import {
  cancelLocalBooking,
  createLocalBooking,
  updateLocalBookingStatus,
} from '~/lib/services/booking-service'
import { getUserIdByCalcomUserId } from '~/lib/services/calcom-tokens-service'
import { createAnalyticsEvent } from '~/server/dal/analytics'

export async function POST(req: Request) {
  const signature = req.headers.get('x-cal-signature-256') ?? ''
  const bodyText = await req.text()

  // Verify signature authenticity
  const expectedSignature = crypto
    .createHmac('sha256', env.CALCOM_WEBHOOK_SECRET)
    .update(bodyText)
    .digest('hex')

  if (
    !crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf8'), Buffer.from(signature, 'utf8'))
  ) {
    logger.error('Webhook signature verification failed for Cal.com payload')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: CalcomWebhookEvent
  try {
    event = JSON.parse(bodyText)
  } catch (err) {
    logger.error('Failed to parse Cal.com webhook payload', err)
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { triggerEvent, payload } = event
  logger.info('Received Cal.com webhook event', {
    triggerEvent,
    bookingId: 'bookingId' in payload ? payload.bookingId : undefined,
  })

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        return await storeBooking(payload)
      // Guest didn't show up
      case 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW':
        {
          const { bookingUid } = event.payload
          // Only update local database - guest no-show
          await updateLocalBookingStatus(bookingUid, 'NO_SHOW', {
            hostNoShow: false,
            attendeeNoShow: true,
          })
          logger.info('Marked guest as no-show', { bookingUid })
        }
        break
      // Host didn't show up - attempt to mark and potentially refund
      case 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW':
        {
          const { bookingUid, attendees } = event.payload

          // Update local database first
          await updateLocalBookingStatus(bookingUid, 'NO_SHOW', {
            hostNoShow: true,
            attendeeNoShow: false,
          })

          // Try to mark as no-show in Cal.com, but don't fail if it errors
          try {
            await markAsNoShow(
              bookingUid,
              attendees.map(attendee => ({
                email: attendee.email,
                absent: true,
              })),
              true // Mark the host as absent
            )
            logger.info('Marked host as no-show in Cal.com', { bookingUid })
          } catch (calcomError) {
            // Log the error but continue - we've already updated our local database
            logger.warn('Failed to mark no-show in Cal.com', calcomError, { bookingUid })
          }
        }
        break
      case 'RECORDING_TRANSCRIPTION_GENERATED':
        logger.info('Transcription generated', { triggerEvent })
        break
      case 'RECORDING_READY':
        logger.info('Recording is ready', { triggerEvent })
        break
      case 'MEETING_STARTED':
        logger.info('Meeting started', { triggerEvent })
        break
      case 'MEETING_ENDED':
        logger.info('Meeting ended', { triggerEvent })
        if (payload?.metadata.mentorUserId) {
          await createAnalyticsEvent({
            eventType: 'COMPLETED_BOOKING',
            targetUserId: payload.metadata.mentorUserId,
            actorUserId: payload.metadata.actorUserId ?? null,
          })
        } else {
          logger.warn('MEETING_ENDED event missing payload or metadata')
        }
        break
      case 'BOOKING_CANCELLED':
        {
          logger.info('Booking cancelled', { bookingUid: event.payload.uid })
          await cancelLocalBooking(event.payload.uid)
          const mentorUserId = await getUserIdByCalcomUserId(event.payload.organizer.id)
          if (mentorUserId) {
            await createAnalyticsEvent({
              eventType: 'CANCELLED_BOOKING',
              targetUserId: mentorUserId,
              actorUserId: mentorUserId,
            })
          }
        }
        break
      default:
        logger.info('Unhandled webhook event type', { triggerEvent })
        break
    }
  } catch (error) {
    logger.error(`Error processing webhook event ${triggerEvent}`, error)
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 })
  }

  return Response.json({ received: true })
}

async function storeBooking(event: CalcomBookingPayload) {
  logger.info('Processing BOOKING_CREATED event')
  try {
    const validation = CalcomBookingPayloadSchema.safeParse(event)
    if (!validation.success) {
      logger.warn('Invalid Cal.com booking payload', undefined, {
        errors: validation.error.flatten(),
      })
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

    const booking = await createLocalBooking({
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
      webhookPayload: event,
    })

    logger.info('Successfully stored booking', { bookingId: booking.id, calcomUid: uid })
    return Response.json(booking, { status: 201 })
  } catch (error) {
    logger.error('Failed to store booking for Cal.com event', error, {
      bookingId: event.bookingId,
    })
    return Response.json({ error: 'Failed to process booking' }, { status: 500 })
  }
}
