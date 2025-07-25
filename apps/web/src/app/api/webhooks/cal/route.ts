import crypto from 'crypto'
import { z } from 'zod'
import { env } from '~/env'
import { createLocalBooking } from '~/server/queries'

export const CalcomBookingPayloadSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  additionalNotes: z.string().optional(),
  customInputs: z.record(z.any()).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  organizer: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    username: z.string(),
    timeZone: z.string(),
    language: z
      .object({
        locale: z.string(),
      })
      .optional(),
    timeFormat: z.string().optional(),
  }),
  responses: z.record(z.any()),
  userFieldsResponses: z.record(z.any()).optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string(),
        timeZone: z.string(),
        language: z
          .object({
            locale: z.string(),
          })
          .optional(),
      })
    )
    .nonempty('At least one attendee is required'),
  location: z.string(),
  destinationCalendar: z
    .object({
      id: z.number(),
      integration: z.string(),
      externalId: z.string().url(),
      userId: z.number(),
      eventTypeId: z.number().nullable(),
      credentialId: z.number(),
    })
    .optional(),
  hideCalendarNotes: z.boolean().optional(),
  requiresConfirmation: z.boolean().nullable().optional(),
  eventTypeId: z.number(),
  seatsShowAttendees: z.boolean().optional(),
  seatsPerTimeSlot: z.number().nullable().optional(),
  uid: z.string(),
  appsStatus: z
    .array(
      z.object({
        appName: z.string(),
        type: z.string(),
        success: z.number(),
        failures: z.number(),
        errors: z.array(z.any()),
        warnings: z.array(z.any()),
      })
    )
    .optional(),
  eventTitle: z.string().optional(),
  eventDescription: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  length: z
    .number()
    .int()
    .positive('Length must be a positive integer')
    .max(60, 'Length cannot exceed 60 minutes'),
  bookingId: z.number(),
  metadata: z.object({
    stripePaymentIntentId: z.string().min(1, 'Stripe payment intent ID is required'),
    paymentId: z.string().optional(),
    mentorUserId: z.string().uuid('Mentor user ID must be a valid UUID'),
  }),
  status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED']),
})

export type CalcomBookingPayload = z.infer<typeof CalcomBookingPayloadSchema>

export const CalcomWebhookSchema = z.object({
  triggerEvent: z.string(),
  createdAt: z.string(),
  payload: CalcomBookingPayloadSchema,
})

export type CalcomWebhookEvent = z.infer<typeof CalcomWebhookSchema>

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
