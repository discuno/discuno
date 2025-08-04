import crypto from 'crypto'
import { env } from '~/env'
import {
  CalcomBookingPayloadSchema,
  type CalcomBookingPayload,
  type CalcomWebhookEvent,
} from '~/lib/schemas/calcom'
import { createLocalBooking } from '~/server/queries'

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
    console.error('❌ Webhook signature verification failed for Cal.com payload')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: CalcomWebhookEvent
  try {
    event = JSON.parse(bodyText)
  } catch (err) {
    console.error('❌ Failed to parse Cal.com webhook payload:', err)
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { triggerEvent, payload } = event
  console.log(`✅ Received Cal.com webhook event: ${triggerEvent}`)

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        return await storeBooking(payload)
      // Add other event types here in the future
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

async function storeBooking(event: CalcomBookingPayload) {
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
      price,
      currency,
      metadata,
    } = validation.data

    const [attendee] = attendees

    const booking = await createLocalBooking({
      calcomBookingId: bookingId,
      calcomUid: uid,
      title,
      startTime: new Date(startTime),
      duration: length,
      organizerUserId: metadata.mentorUserId,
      calcomOrganizerEmail: organizer.email,
      calcomOrganizerUsername: organizer.username,
      calcomOrganizerName: organizer.name,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      attendeeTimeZone: attendee.timeZone,
      price: price ?? 0,
      currency: currency ?? 'USD',
      calcomEventTypeId: eventTypeId,
      paymentId: metadata.paymentId ? Number(metadata.paymentId) : undefined,
      requiresPayment: !!price,
    })

    console.log(`✅ Successfully stored booking ${booking.id} for Cal.com event ${uid}`)
    return Response.json(booking, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to store booking for Cal.com event:`, errorMessage)
    console.error('Raw payload:', JSON.stringify(event, null, 2))
    return Response.json({ error: 'Failed to process booking' }, { status: 500 })
  }
}
