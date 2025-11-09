'use server'
import 'server-only'

import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { z } from 'zod'
import { env } from '~/env'
import { inngest } from '~/inngest/client'
import { requireNonAnonymousAuth } from '~/lib/auth/auth-utils'
import { createCalcomBooking } from '~/lib/calcom'
import { MINIMUM_PAID_BOOKING_PRICE } from '~/lib/constants'
import { BadRequestError, ExternalApiError, StripeError } from '~/lib/errors'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import { mentorStripeAccount, payment } from '~/server/db/schema/index'
import { getMentorCalcomTokensByUsername } from '~/server/queries/calcom'
import { getMentorEnabledEventTypes } from '~/server/queries/event-types'

interface BookingData {
  name: string
  email: string
  timeZone?: string
}

export interface CreateBookingInput {
  username: string
  eventTypeId: number
  startTime: string // ISO string
  attendee: BookingData
  mentorUserId: string
}

export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  // Require authenticated user (not anonymous) to create booking
  await requireNonAnonymousAuth()

  const { eventTypeId, startTime, attendee, mentorUserId } = input

  const booking = await createCalcomBooking({
    calcomEventTypeId: eventTypeId,
    start: startTime,
    attendeeName: attendee.name,
    attendeeEmail: attendee.email,
    timeZone: attendee.timeZone ?? 'America/New_York',
    mentorUserId,
  })

  return booking.uid
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface EventType {
  id: number
  title: string
  length: number
  description?: string
  price?: number
  currency?: string
}

// Enhanced interface for payment bookings
// Zod schema for payment booking validation
const BookingFormInputSchema = z.object({
  eventTypeId: z.number().int().positive('Event type ID must be a positive integer'),
  startTimeIso: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Start time must be a valid ISO date string',
  }),
  attendeeName: z
    .string()
    .trim()
    .min(1, 'Attendee name is required')
    .max(100, 'Name must be at most 100 characters'),
  attendeeEmail: z.string().trim().email('Valid email is required'),
  attendeePhone: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || /^\+?[0-9\s\-()]{7,20}$/.test(val), {
      message: 'Phone number must be a valid international phone number',
    }),
  mentorUsername: z
    .string()
    .trim()
    .min(3, 'Mentor username must be at least 3 characters')
    .max(100, 'Mentor username must be at most 100 characters')
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
    length: pref.duration,
    description: pref.description ?? undefined,
    price: pref.customPrice ?? undefined, // Keep in cents for consistency with display logic
    currency: pref.currency,
  }))
}

/**
 * Fetch available slots for a given date range and username
 */
export const fetchAvailableSlots = async (
  eventTypeId: number,
  startDate: Date,
  endDate: Date,
  timeZone?: string
): Promise<Record<string, TimeSlot[]>> => {
  const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/slots`)
  url.searchParams.append('eventTypeId', eventTypeId.toString())
  url.searchParams.append('start', new Date(startDate).toISOString())
  url.searchParams.append('end', new Date(endDate).toISOString())
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

  const availableSlots: Record<string, TimeSlot[]> = {}

  for (const dateKey in data.data) {
    const slots = data.data[dateKey]
    if (slots) {
      availableSlots[dateKey] = slots.map(s => ({
        time: s.start,
        available: true,
      }))
    }
  }

  return availableSlots
}

/**
 * Create a paid booking with Stripe Payment Intent including tax calculation
 */
export const createStripeCheckoutSession = async (
  input: BookingFormInput
): Promise<{
  success: boolean
  clientSecret?: string
  checkoutSessionId?: string
}> => {
  // Require authenticated user (not anonymous) to create booking
  await requireNonAnonymousAuth()

  try {
    const validatedInput = BookingFormInputSchema.parse(input)
    const {
      eventTypeId,
      startTimeIso,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      mentorUsername,
      mentorUserId,
      price: subtotal,
      currency,
      timeZone,
    } = validatedInput

    console.log('Creating Stripe checkout session for:', {
      mentorUsername,
      attendeeEmail,
      price: subtotal,
    })

    if (subtotal > 0 && subtotal < MINIMUM_PAID_BOOKING_PRICE) {
      throw new BadRequestError('The minimum price for a paid booking is $5.00.')
    }

    if (subtotal === 0) {
      console.log('Skipping Stripe for free booking.')
      throw new BadRequestError('Free bookings should use direct booking flow')
    }

    const stripeAccount = await db
      .select()
      .from(mentorStripeAccount)
      .where(eq(mentorStripeAccount.userId, mentorUserId))
      .limit(1)

    if (!stripeAccount.length || !stripeAccount[0]?.stripeAccountId) {
      console.error(`Mentor ${mentorUsername} has not set up a Stripe account.`)
      throw new BadRequestError('Mentor has not set up payments')
    }

    const stripeAccountData = stripeAccount[0]
    const menteeFee = Math.round(subtotal * 0.05)
    const mentorFee = Math.round(subtotal * 0.15)

    const existingCustomer = await stripe.customers.list({
      email: attendeeEmail,
      limit: 1,
    })

    const customerId = existingCustomer.data[0]?.id

    const createParams: Stripe.Checkout.SessionCreateParams = {
      automatic_tax: { enabled: true, liability: { type: 'self' } },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Mentor Session',
              metadata: {
                mentorUserId: mentorUserId.toString(),
                eventTypeId: eventTypeId.toString(),
                startTime: startTimeIso,
                attendeeName: attendeeName,
              },
            },
            unit_amount: subtotal,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ui_mode: 'custom',
      allow_promotion_codes: true,
      adaptive_pricing: { enabled: true },
      consent_collection: {
        payment_method_reuse_agreement: { position: 'auto' },
        promotions: 'auto',
      },
      billing_address_collection: 'required',
      currency: currency.toLowerCase(),
      ...(customerId
        ? {
            customer: customerId,
            customer_update: {
              address: 'auto',
              name: 'auto',
            },
          }
        : {
            customer_email: attendeeEmail,
            customer_creation: 'if_required',
          }),
      // TODO: discounts
      payment_intent_data: {
        capture_method: 'automatic_async',
        transfer_data: {
          destination: stripeAccountData.stripeAccountId,
          amount: subtotal - mentorFee,
        },
        receipt_email: attendeeEmail,
        setup_future_usage: 'on_session',
        statement_descriptor_suffix: `MENTOR SESSION`,
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          issuer: {
            type: 'self',
          },
        },
      },
      payment_method_options: {
        card: {},
        paypal: {},
      },
      saved_payment_method_options: {
        allow_redisplay_filters: ['always'],
        payment_method_remove: 'enabled',
        payment_method_save: 'enabled',
      },
      return_url: `${env.NEXT_PUBLIC_BASE_URL}/bookings/success`,

      metadata: {
        mentorUserId: mentorUserId.toString(),
        eventTypeId: eventTypeId.toString(),
        startTime: startTimeIso,
        attendeeName: attendeeName,
        attendeeEmail: attendeeEmail,
        attendeePhone: attendeePhone ?? '',
        attendeeTimeZone: timeZone,
        mentorUsername: mentorUsername,
        mentorFee: mentorFee.toString(),
        menteeFee: menteeFee.toString(),
        mentorAmount: (subtotal - mentorFee).toString(),
        mentorStripeAccountId: stripeAccountData.stripeAccountId,
      },
    }

    const session = await stripe.checkout.sessions.create(createParams)

    console.log(`Successfully created Checkout Session: ${session.id}`)
    return {
      success: session.client_secret !== null,
      clientSecret: session.client_secret ?? undefined,
      checkoutSessionId: session.id,
    }
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error)
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Invalid input data.')
    }

    // Handle specific Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; code?: string; message?: string }

      // Handle insufficient capabilities error specifically
      if (stripeError.code === 'insufficient_capabilities_for_transfer') {
        throw new StripeError(
          "The mentor's payment account needs additional capabilities to receive transfers. Please contact the mentor to complete their payment setup."
        )
      }

      // Handle other specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        throw new StripeError(stripeError.message ?? 'Invalid request to Stripe')
      }
    }

    // Generic fallback for other errors
    throw new ExternalApiError('Failed to create checkout session.')
  }
}

// processCheckoutSessionSideEffects removed - now handled by Inngest
// See ~/inngest/functions.ts for the implementation

/**
 * Handle completed checkout sessions - Webhook handler
 *
 * ✅ STEP 1: Transactional Core (must succeed or fail fast)
 * - Validate event
 * - Persist payment to DB (with idempotency)
 * - Return 200 OK to Stripe immediately
 *
 * ✅ STEP 2: Deferred Side Effects (via Inngest)
 * - Triggers Inngest function for:
 *   - PostHog tracking
 *   - Cal.com booking creation
 *   - Email notifications
 *   - Refunds if needed
 *
 * Inngest provides:
 * - Automatic retries with exponential backoff
 * - Step-by-step execution with durability
 * - Built-in observability and debugging UI
 * - Event cancellation (if checkout is cancelled)
 */
export const handleCheckoutSessionWebhook = async (
  session: Stripe.Checkout.Session
): Promise<Response> => {
  const { metadata, id: sessionId } = session

  // ============================================
  // STEP 1: TRANSACTIONAL CORE - Validate & Persist
  // ============================================

  if (!metadata) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'error',
        event: 'missing_metadata',
        sessionId,
      })
    )
    return new Response(JSON.stringify({ error: 'Missing metadata' }), { status: 400 })
  }

  console.info(
    JSON.stringify({
      tag: 'CheckoutWebhook',
      level: 'info',
      event: 'webhook_received',
      sessionId,
    })
  )

  // Validate required metadata
  if (
    !metadata.mentorUserId ||
    !metadata.attendeeEmail ||
    !metadata.attendeeName ||
    !metadata.mentorFee ||
    !metadata.menteeFee ||
    !metadata.mentorAmount ||
    !metadata.mentorUsername ||
    !metadata.startTime ||
    !metadata.attendeeTimeZone ||
    !metadata.mentorStripeAccountId
  ) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'error',
        event: 'missing_required_metadata',
        sessionId,
        metadata: Object.keys(metadata),
      })
    )
    return new Response(JSON.stringify({ error: 'Missing required metadata' }), { status: 400 })
  }

  const disputePeriodEnd = new Date()
  disputePeriodEnd.setHours(disputePeriodEnd.getHours() + 72)

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  if (!paymentIntentId) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'error',
        event: 'missing_payment_intent_id',
        sessionId,
      })
    )
    return new Response(JSON.stringify({ error: 'Missing payment intent id' }), { status: 400 })
  }

  // Persist payment record to database (canonical state) with idempotency
  const insertData: typeof payment.$inferInsert = {
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: paymentIntentId,
    mentorUserId: metadata.mentorUserId,
    customerEmail: metadata.attendeeEmail,
    customerName: metadata.attendeeName,
    amount: session.amount_total ?? 0,
    currency: session.currency?.toUpperCase() ?? 'USD',
    mentorFee: parseInt(metadata.mentorFee),
    menteeFee: parseInt(metadata.menteeFee),
    mentorAmount: parseInt(metadata.mentorAmount),
    platformStatus: 'SUCCEEDED',
    stripeStatus: session.status ?? undefined,
    disputePeriodEnds: disputePeriodEnd,
    metadata: { checkoutSessionMetadata: metadata },
  }

  // Use onConflictDoNothing for idempotency - if Stripe retries webhook, we skip duplicate insert
  const paymentRecord = await db
    .insert(payment)
    .values(insertData)
    .onConflictDoNothing({ target: payment.stripePaymentIntentId })
    .returning()

  if (!paymentRecord[0]) {
    // Payment already exists (webhook retry) - still return 200 OK
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'payment_already_exists',
        sessionId,
        paymentIntentId,
        message: 'Idempotent webhook retry detected',
      })
    )
    return new Response('ok', { status: 200 })
  }

  console.info(
    JSON.stringify({
      tag: 'CheckoutWebhook',
      level: 'info',
      event: 'payment_record_created',
      sessionId,
      paymentIntentId,
      paymentId: paymentRecord[0].id,
    })
  )

  // ============================================
  // STEP 2: DEFERRED SIDE EFFECTS - Trigger Inngest
  // ============================================

  // Trigger Inngest function for side effects (Cal.com booking, PostHog, refunds, emails)
  // Inngest provides automatic retries, observability, and error handling
  try {
    await inngest.send({
      name: 'stripe/checkout.completed',
      data: {
        paymentId: paymentRecord[0].id,
        paymentIntentId,
        sessionId,
        metadata: {
          mentorUserId: metadata.mentorUserId,
          eventTypeId: metadata.eventTypeId,
          startTime: metadata.startTime,
          attendeeName: metadata.attendeeName,
          attendeeEmail: metadata.attendeeEmail,
          attendeePhone: metadata.attendeePhone,
          attendeeTimeZone: metadata.attendeeTimeZone,
          mentorUsername: metadata.mentorUsername,
          mentorFee: metadata.mentorFee,
          menteeFee: metadata.menteeFee,
          mentorAmount: metadata.mentorAmount,
          mentorStripeAccountId: metadata.mentorStripeAccountId,
        },
        sessionAmount: session.amount_total,
        sessionCurrency: session.currency,
      },
    })
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'inngest_event_sent',
        sessionId,
        paymentIntentId,
      })
    )
  } catch (inngestError) {
    // This is a critical failure. If we can't queue the job, we need Stripe to retry.
    // The database insert is idempotent, so retries are safe.
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'critical',
        event: 'inngest_event_failed',
        sessionId,
        paymentIntentId,
        error: inngestError instanceof Error ? inngestError.message : 'Unknown error',
        message: 'Failed to queue side-effects. Stripe will retry this webhook.',
      })
    )
    // Return a 500 error to signal failure to Stripe, so it can retry the webhook
    return new Response('Failed to send event to Inngest', { status: 500 })
  }

  // Return success immediately to Stripe
  console.info(
    JSON.stringify({
      tag: 'CheckoutWebhook',
      level: 'info',
      event: 'webhook_response_sent',
      sessionId,
    })
  )
  return new Response('ok', { status: 200 })
}
