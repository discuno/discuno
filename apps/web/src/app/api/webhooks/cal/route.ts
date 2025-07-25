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

  if (triggerEvent === 'BOOKING_CREATED') {
    try {
      return await storeBooking(payload)
    } catch {
      return Response.json({ error: 'Failed to process booking' }, { status: 500 })
    }
  } else {
    console.log(`ℹ️ Unhandled webhook event type: ${triggerEvent}`)
  }

  return Response.json({ received: true })
}

async function storeBooking(event: CalcomBookingPayload) {
  console.log('✅ Cal.com booking payload received:', JSON.stringify(event, null, 2))
  const validation = CalcomBookingPayloadSchema.safeParse(event)
  if (!validation.success) {
    console.warn('❌ Invalid Cal.com booking payload:', validation.error)
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
  } = event

  const [attendee] = attendees

  const booking = createLocalBooking({
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
    mentorEventTypeId: eventTypeId,
    paymentId: metadata.paymentId ? Number(metadata.paymentId) : undefined,
    requiresPayment: !!price,
  })

  return Response.json(booking, { status: 201 })
}
