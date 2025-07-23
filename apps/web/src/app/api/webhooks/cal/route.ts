import crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { env } from '~/env'
import { db } from '~/server/db'
import { bookings, calcomTokens, eventTypes, mentorEventTypes } from '~/server/db/schema'

interface CalcomBookingPayload {
  type: string
  title: string
  description?: string
  additionalNotes?: string
  customInputs?: Record<string, any>
  startTime: string
  endTime: string
  organizer: {
    id: number
    name: string
    email: string
    username: string
    timeZone?: string
    language?: {
      locale: string
    }
    timeFormat?: string
  }
  responses: Record<string, any>
  userFieldsResponses?: Record<string, any>
  attendees: Array<{
    email: string
    name: string
    timeZone?: string
    language?: {
      locale: string
    }
  }>
  location?: string
  destinationCalendar?: {
    id: number
    integration: string
    externalId: string
    userId: number
    eventTypeId: number | null
    credentialId: number
  }
  hideCalendarNotes?: boolean
  requiresConfirmation?: boolean | null
  eventTypeId: number
  seatsShowAttendees?: boolean
  seatsPerTimeSlot?: number | null
  uid: string
  appsStatus?: Array<{
    appName: string
    type: string
    success: number
    failures: number
    errors: any[]
    warnings: any[]
  }>
  eventTitle?: string
  eventDescription?: string
  price?: number
  currency?: string
  length?: number
  bookingId: number
  metadata?: Record<string, any>
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
}

interface CalcomWebhookEvent {
  triggerEvent: string
  createdAt: string
  payload: CalcomBookingPayload
}

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
    return new Response('Invalid signature', { status: 400 })
  }

  let event: CalcomWebhookEvent
  try {
    event = JSON.parse(bodyText)
  } catch (err) {
    console.error('❌ Failed to parse Cal.com webhook payload:', err)
    return new Response('Invalid payload', { status: 400 })
  }

  const { triggerEvent, payload } = event
  console.log(`✅ Received Cal.com webhook event: ${triggerEvent}`)

  if (triggerEvent === 'BOOKING_CREATED') {
    try {
      await handleBookingCreated(payload, event)
      console.log(`✅ Successfully processed BOOKING_CREATED for booking ${payload.bookingId}`)
    } catch (error) {
      console.error('❌ Failed to process BOOKING_CREATED webhook:', error)
      return new Response('Failed to process booking', { status: 500 })
    }
  } else {
    console.log(`ℹ️ Unhandled webhook event type: ${triggerEvent}`)
  }

  return NextResponse.json({ received: true })
}

async function handleBookingCreated(payload: CalcomBookingPayload, fullEvent: CalcomWebhookEvent) {
  const {
    bookingId,
    uid,
    title,
    startTime,
    endTime,
    status,
    organizer,
    attendees,
    responses,
    eventTypeId,
    type, // This is the event type slug
  } = payload

  console.log('eventTypeId:', eventTypeId)
  console.log('Event type slug:', type)
  // Find the organizer in our database by Cal.com username
  const organizerTokens = await db
    .select({
      userId: calcomTokens.userId,
    })
    .from(calcomTokens)
    .where(eq(calcomTokens.calcomUsername, organizer.username))
    .limit(1)

  if (!organizerTokens.length) {
    throw new Error(`Organizer not found in database: ${organizer.username}`)
  }

  const organizerRecord = organizerTokens[0]
  if (!organizerRecord) {
    throw new Error(`Organizer record is null: ${organizer.username}`)
  }

  const organizerId = organizerRecord.userId

  // Find the mentor event type by matching the event type slug from the webhook
  const mentorEventType = await db
    .select({
      id: mentorEventTypes.id,
      customPrice: mentorEventTypes.customPrice,
      currency: mentorEventTypes.currency,
    })
    .from(mentorEventTypes)
    .innerJoin(eventTypes, eq(mentorEventTypes.eventTypeId, eventTypes.id))
    .where(and(eq(mentorEventTypes.userId, organizerId), eq(eventTypes.calcomEventTypeSlug, type)))
    .limit(1)

  console.log(`mentorEventType by slug (${type}):`, mentorEventType)

  // Get the first attendee (primary attendee)
  const primaryAttendee = attendees[0]
  if (!primaryAttendee) {
    throw new Error('No attendees found in booking')
  }

  // Insert the booking into our database
  await db.insert(bookings).values({
    calcomBookingId: bookingId,
    calcomUid: uid,
    title,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status,
    organizerId,
    organizerName: organizer.name,
    organizerEmail: organizer.email,
    organizerUsername: organizer.username,
    attendeeName: primaryAttendee.name,
    attendeeEmail: primaryAttendee.email,
    attendeeTimeZone: primaryAttendee.timeZone,
    price: mentorEventType[0]?.customPrice ?? null,
    currency: mentorEventType[0]?.currency ?? 'USD',
    mentorEventTypeId: mentorEventType[0]?.id ?? null,
    responses,
    webhookPayload: fullEvent,
  })
}
