'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getMentorCalcomEventTypeId } from '~/app/(app)/(public)/mentor/[username]/book/bookingHelpers'
import { env } from '~/env'
import { createCalcomBooking } from '~/lib/calcom'
import { sendBookingConfirmationEmail } from '~/lib/emails/booking-notifications'
import { BadRequestError, ExternalApiError } from '~/lib/errors'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import { mentorStripeAccounts, payments } from '~/server/db/schema'
import {
  createLocalBooking,
  getEventTypeWithPricingBySlug,
  getMentorByUsername,
  getMentorCalcomTokensByUsername,
  getMentorEnabledEventTypes,
} from '~/server/queries'

interface TimeSlot {
  time: string
  available: boolean
}

export interface EventType {
  id: number
  title: string
  slug: string
  length: number
  description?: string
  price?: number
  currency?: string
}

interface BookingData {
  name: string
  email: string
  timeZone?: string
}

interface CreateBookingInput {
  username: string
  eventSlug: string
  startTime: string // ISO string
  attendee: BookingData
  metadata?: {
    stripePaymentIntentId?: string
  }
}

// Enhanced interface for payment bookings
// Zod schema for payment booking validation
const BookingFormInputSchema = z.object({
  eventTypeId: z.number().int().positive('Event type ID must be a positive integer'),
  eventTypeSlug: z.string().min(1, 'Event type slug is required'),
  startTimeIso: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Start time must be a valid ISO date string',
  }),
  attendeeName: z
    .string()
    .trim()
    .min(1, 'Attendee name is required')
    .max(100, 'Name must be at most 100 characters'),
  attendeeEmail: z.string().trim().email('Valid email is required'),
  mentorUsername: z
    .string()
    .trim()
    .min(3, 'Mentor username must be at least 3 characters')
    .max(50, 'Mentor username must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9.-]+$/,
      'Mentor username can only contain letters, numbers, dots, and dashes'
    ),
  mentorUserId: z.string().uuid('Mentor userId must be a valid UUID'),
  price: z
    .number()
    .int()
    .nonnegative('Price must be a non-negative integer')
    .max(1000000, 'Price exceeds maximum allowed value'),
  currency: z
    .string()
    .length(3, 'Currency must be exactly 3 characters')
    .toUpperCase()
    .refine(val => /^[A-Z]{3}$/.test(val), {
      message: 'Currency must be a valid 3-letter ISO code',
    }),
  timeZone: z.string().min(1, 'Time zone is required'),
})

export type BookingFormInput = z.infer<typeof BookingFormInputSchema>

type AvailableSlotsResponse = {
  status: 'success' | 'error'
  data: {
    [date: string]: {
      start: string // ISO 8601 string with timezone offset
    }[]
  }
}

/**
 * Fetch available event types for a given username (using database with joins)
 */
export const fetchEventTypes = async (username: string): Promise<EventType[]> => {
  const mentorTokens = await getMentorCalcomTokensByUsername(username)

  if (!mentorTokens) {
    throw new ExternalApiError(`No Cal.com tokens found for user: ${username}`)
  }

  const mentorPrefs = await getMentorEnabledEventTypes(mentorTokens.userId)

  if (!mentorPrefs.length) {
    console.log(`No enabled event types found for user: ${username}`)
    return []
  }

  return mentorPrefs.map(pref => ({
    id: pref.calcomEventTypeId,
    title: pref.title,
    slug: pref.calcomEventTypeSlug,
    length: pref.duration,
    description: pref.description ?? undefined,
    price: pref.customPrice ? pref.customPrice / 100 : undefined,
    currency: pref.currency,
  }))
}

/**
 * Fetch available slots for a given date and username
 */
export const fetchAvailableSlots = async (
  username: string,
  eventSlug: string,
  date: Date,
  timeZone?: string
): Promise<TimeSlot[]> => {
  // Build date range
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/slots`)
  url.searchParams.append('username', username)
  url.searchParams.append('eventTypeSlug', eventSlug)
  url.searchParams.append('start', start.toISOString())
  url.searchParams.append('end', end.toISOString())
  if (timeZone) url.searchParams.append('timeZone', timeZone)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
      'cal-api-version': '2024-09-04',
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new ExternalApiError(`Failed to fetch slots: ${response.status} ${err}`)
  }

  const data: AvailableSlotsResponse = await response.json()

  if (data.status !== 'success' || typeof data.data !== 'object') {
    throw new ExternalApiError('Invalid slots response')
  }

  const key = start.toISOString().split('T')[0]

  if (!key) {
    throw new BadRequestError('No slots available for the selected date')
  }

  const raw = data.data[key] ?? []

  return raw.map((s: any) => ({
    time: new Date(s.start).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone ?? 'America/New_York',
    }),
    available: true,
  }))
}

/**
 * Create a booking via Cal.com API and store it locally
 */
export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  // Transform input to match Cal.com v2 API format
  const calcomPayload = {
    start: input.startTime, // ISO string in UTC
    attendee: {
      name: input.attendee.name,
      email: input.attendee.email,
      timeZone: input.attendee.timeZone ?? 'America/New_York',
      language: 'en', // Default language
    },
    eventTypeSlug: input.eventSlug,
    username: input.username,
    metadata: { stripePaymentIntentId: input.metadata?.stripePaymentIntentId ?? '' },
  }

  // Create booking via Cal.com API
  const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'cal-api-version': '2024-08-13',
    },
    body: JSON.stringify(calcomPayload),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new ExternalApiError(`Failed to create booking: ${response.status} ${err}`)
  }

  const data = await response.json()

  if (data.status === 'success' && data.data?.uid) {
    // Booking successfully created in Cal.com
    // The webhook will handle storing the booking in our database
    return data.data.uid
  }

  throw new ExternalApiError(data.error ?? 'Unknown booking error')
}

/**
 * Create a paid booking with Stripe Payment Intent
 */
export const createStripePaymentIntent = async (
  input: BookingFormInput
): Promise<{
  success: boolean
  clientSecret?: string
  error?: string
}> => {
  const {
    eventTypeSlug,
    startTimeIso,
    attendeeName,
    attendeeEmail,
    mentorUsername,
    mentorUserId,
    price,
    currency,
    timeZone,
  } = input
  // TODO: Handle case where price is 0 (free bookings)
  try {
    // Get mentor's Stripe account
    const stripeAccount = await db
      .select()
      .from(mentorStripeAccounts)
      .where(eq(mentorStripeAccounts.userId, mentorUserId))
      .limit(1)

    if (!stripeAccount.length || !stripeAccount[0]?.stripeAccountId) {
      return { success: false, error: 'Mentor has not set up payments' }
    }

    const stripeAccountData = stripeAccount[0]

    // Calculate fees
    const platformFee = Math.round(price * 0.05) // 5% platform fee
    const mentorAmount = price - platformFee
    const total = Math.round((price + platformFee)) // Customer pays session fee + platform fee

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: currency,
      metadata: {
        mentorUserId: mentorUserId.toString(),
        eventTypeSlug: eventTypeSlug,
        startTime: startTimeIso,
        attendeeName: attendeeName,
        attendeeEmail: attendeeEmail,
        attendeeTimeZone: timeZone,
        mentorUsername: mentorUsername,
        platformFee: platformFee.toString(),
        mentorAmount: mentorAmount.toString(),
        mentorStripeAccountId: stripeAccountData.stripeAccountId,
      },
    })

    return {
      success: paymentIntent.client_secret !== null,
      clientSecret: paymentIntent.client_secret ?? undefined,
    }
  } catch (stripeError) {
    console.error('Stripe payment intent creation failed:', stripeError)
    return { success: false, error: 'Failed to create payment session' }
  }
}

/**
 * Handle completed payment intents and create bookings
 */
export const handlePaymentIntentComplete = async (
  paymentIntentId: string
): Promise<{
  success: boolean
  bookingId?: number
  error?: string
}> => {
  try {
    // 1. Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return { success: false, error: 'Payment not completed' }
    }

    // Check if we already processed this payment intent
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1)

    if (existingPayment.length > 0) {
      const bookingId = existingPayment[0]?.bookingId
      return { success: true, clientSecret bookingId: bookingId ?? 0 }
    }

    // Validate required metadata
    const metadata = paymentIntent.metadata
    if (
      !metadata.mentorUserId ||
      !metadata.attendeeEmail ||
      !metadata.attendeeName ||
      !metadata.eventTypeSlug ||
      !metadata.mentorUsername ||
      !metadata.startTime ||
      !metadata.attendeeTimeZone ||
      !metadata.platformFee ||
      !metadata.mentorAmount
    ) {
      return { success: false, error: 'Missing required payment metadata' }
    }

    // 2. Store payment record
    const disputePeriodEnd = new Date()
    disputePeriodEnd.setHours(disputePeriodEnd.getHours() + 72)

    const payment = await db
      .insert(payments)
      .values({
        stripePaymentIntentId: paymentIntent.id,
        mentorUserId: metadata.mentorUserId,
        customerEmail: metadata.attendeeEmail,
        customerName: metadata.attendeeName,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        platformFee: parseInt(metadata.platformFee),
        mentorAmount: parseInt(metadata.mentorAmount),
        platformStatus: 'SUCCEEDED',
        stripeStatus: paymentIntent.status,
        disputePeriodEnds: disputePeriodEnd,
        metadata: { paymentIntentMetadata: paymentIntent.metadata },
      })
      .returning()

    if (!payment[0]) {
      return { success: false, error: 'Failed to create payment record' }
    }

    const newPayment = payment[0]

    // 3. Create the booking
    const mentor = await getMentorByUsername(metadata.mentorUsername)
    const eventType = await getEventTypeWithPricingBySlug(metadata.eventTypeSlug, mentor.id)

    const mentorCalcomEventTypeId = await getMentorCalcomEventTypeId(
      mentor.username,
      metadata.eventTypeSlug
    )

    const calcomBooking = await createCalcomBooking({
      eventTypeId: mentorCalcomEventTypeId,
      start: new Date(metadata.startTime).toISOString(),
      attendeeName: metadata.attendeeName,
      attendeeEmail: metadata.attendeeEmail,
      timeZone: metadata.attendeeTimeZone,
    })

    const localBooking = await createLocalBooking({
      calcomBookingId: calcomBooking.id,
      calcomUid: calcomBooking.uid,
      title: eventType.title,
      startTime: new Date(metadata.startTime),
      duration: eventType.duration,
      organizerId: mentor.id,
      organizerName: mentor.name ?? mentor.username,
      organizerEmail: mentor.email ?? '',
      organizerUsername: mentor.username,
      attendeeName: metadata.attendeeName,
      attendeeEmail: metadata.attendeeEmail,
      attendeeTimeZone: metadata.attendeeTimeZone,
      price: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      mentorEventTypeId: eventType.id,
      paymentId: newPayment.id,
      requiresPayment: true,
    })

    // 4. Update payment with booking ID
    await db
      .update(payments)
      .set({ bookingId: localBooking.id })
      .where(eq(payments.id, newPayment.id))

    // 5. Send confirmation email
    if (mentor.email) {
      await sendBookingConfirmationEmail({
        attendeeEmail: metadata.attendeeEmail,
        mentorEmail: mentor.email,
        booking: localBooking,
      })
    }

    return { success: true, bookingId: localBooking.id }
  } catch (error) {
    console.error('handlePaymentIntentComplete error:', error)
    return { success: false, error: 'Failed to complete booking' }
  }
}
