'use server'
import 'server-only'

import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { z } from 'zod'
import { env } from '~/env'
import { inngest } from '~/inngest/client'
import { requireAuth } from '~/lib/auth/auth-utils'
import { createCalcomBooking, getCalcomBookingCompatibility } from '~/lib/calcom'
import { CALCOM_API_VERSIONS } from '~/lib/calcom/client'
import { MAXIMUM_PAID_BOOKING_PRICE, MINIMUM_PAID_BOOKING_PRICE } from '~/lib/constants'
import { AppError, BadRequestError, ExternalApiError, StripeError } from '~/lib/errors'
import { freeBookingActorRatelimit, freeBookingIpRatelimit, ratelimit } from '~/lib/rate-limiter'
import { stripe } from '~/lib/stripe'
import {
  getCheckoutFulfillmentEventId,
  getCheckoutPaymentIntentId,
  isCheckoutSessionReadyForFulfillment,
} from '~/lib/stripe/checkout'
import { getOrCreateStripeCustomerId } from '~/lib/stripe/customer'
import { calculateMarketplaceAmounts, getMentorPayoutEligibleAt } from '~/lib/stripe/marketplace'
import { db } from '~/server/db'
import { mentorStripeAccount, payment } from '~/server/db/schema/index'
import { getCalcomConnectionByUsername } from '~/server/queries/calcom'
import { getMentorEnabledEventTypes } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

const EventTypeIdSchema = z.number().int().positive('Event type ID must be a positive integer')
const StartTimeSchema = z.iso
  .datetime({
    offset: true,
    error: 'Start time must be a valid ISO date string with a UTC designator or time zone offset',
  })
  .transform(value => new Date(value).toISOString())
  .refine(value => Date.parse(value) > Date.now(), {
    message: 'Start time must be in the future',
  })
const AttendeeNameSchema = z
  .string()
  .trim()
  .min(2, 'Attendee name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
const AttendeeEmailSchema = z.string().trim().email('Valid email is required').max(255)
const MentorUsernameSchema = z
  .string()
  .trim()
  .min(3, 'Mentor username must be at least 3 characters')
  .max(100, 'Mentor username must be at most 100 characters')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Mentor username can only contain letters, numbers, dots, underscores, and dashes'
  )
const TimeZoneSchema = z
  .string()
  .trim()
  .min(1, 'Time zone is required')
  .max(100, 'Time zone is too long')
  .refine(value => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value })
      return true
    } catch {
      return false
    }
  }, 'Time zone must be valid')

const CreateBookingInputSchema = z.object({
  username: MentorUsernameSchema,
  eventTypeId: EventTypeIdSchema,
  startTime: StartTimeSchema,
  attendee: z.object({
    name: AttendeeNameSchema,
    email: AttendeeEmailSchema,
    timeZone: TimeZoneSchema.optional(),
  }),
})

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>

export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  // Anonymous sessions provide an actor ID and CSRF-protected server-action boundary
  // without forcing account creation during checkout.
  const { user } = await requireAuth()
  const requestHeaders = await headers()
  const forwardedIp =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip')?.trim()
  const ipFingerprint = forwardedIp ? createHash('sha256').update(forwardedIp).digest('hex') : null
  const [actorLimit, ipLimit] = await Promise.all([
    freeBookingActorRatelimit.limit(user.id),
    ipFingerprint
      ? freeBookingIpRatelimit.limit(ipFingerprint)
      : Promise.resolve({ success: true }),
  ])
  if (!actorLimit.success || !ipLimit.success) {
    throw new BadRequestError('Too many booking attempts. Please try again later.')
  }

  const validatedInput = CreateBookingInputSchema.safeParse(input)
  if (!validatedInput.success) throw new BadRequestError('Invalid booking details')

  const { eventTypeId, startTime, attendee, username } = validatedInput.data
  const { mentorConnection, eventType } = await resolveBookableEventType(username, eventTypeId)

  if ((eventType.customPrice ?? 0) > 0) {
    throw new BadRequestError('Paid sessions must use secure checkout')
  }
  if (user.id === mentorConnection.userId) {
    throw new BadRequestError('You cannot book your own mentor session')
  }

  const bookingAttemptId = createHash('sha256')
    .update(`free:${user.id}:${eventTypeId}:${startTime}`)
    .digest('hex')

  const booking = await createCalcomBooking({
    calcomEventTypeId: eventTypeId,
    start: startTime,
    attendeeName: attendee.name,
    attendeeEmail: attendee.email,
    timeZone: attendee.timeZone ?? 'America/New_York',
    mentorUserId: mentorConnection.userId,
    actorUserId: user.id,
    bookingAttemptId,
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
  eventTypeId: EventTypeIdSchema,
  startTimeIso: StartTimeSchema,
  attendeeName: AttendeeNameSchema,
  attendeeEmail: AttendeeEmailSchema,
  attendeePhone: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || /^\+?[0-9\s\-()]{7,20}$/.test(val), {
      message: 'Phone number must be a valid international phone number',
    }),
  mentorUsername: MentorUsernameSchema,
  timeZone: TimeZoneSchema,
})

const CheckoutSessionMetadataSchema = z.object({
  mentorUserId: z.uuid(),
  eventTypeId: z.string().regex(/^\d+$/),
  startTime: z.iso.datetime(),
  attendeeName: AttendeeNameSchema,
  attendeeEmail: AttendeeEmailSchema,
  attendeePhone: z.string().max(50),
  attendeeTimeZone: TimeZoneSchema,
  mentorUsername: z.string().trim().min(1).max(255),
  actorUserId: z.uuid(),
  eventDurationMinutes: z.string().regex(/^\d+$/),
  payoutEligibleAt: z.iso.datetime(),
  transferGroup: z.string().startsWith('discuno_booking_').max(255),
  mentorFee: z.string().regex(/^\d+$/),
  menteeFee: z.string().regex(/^\d+$/),
  mentorAmount: z.string().regex(/^\d+$/),
  mentorStripeAccountId: z.string().startsWith('acct_').max(255),
})

export type BookingFormInput = z.infer<typeof BookingFormInputSchema>

const resolveBookableEventType = async (username: string, eventTypeId: number) => {
  const mentorProfile = await getPublicProfileByUsername(username)
  if (!mentorProfile?.calcomUsername) {
    throw new BadRequestError('This mentor is not available for booking')
  }

  const mentorConnection = await getCalcomConnectionByUsername(mentorProfile.calcomUsername)
  const enabledEventTypes = await getMentorEnabledEventTypes(mentorProfile.userId)
  const eventType = enabledEventTypes.find(item => item.calcomEventTypeId === eventTypeId)

  if (!eventType) {
    throw new BadRequestError('This mentor session is not available for booking')
  }

  if (mentorConnection.userId !== mentorProfile.userId) {
    throw new BadRequestError('Mentor scheduling configuration is inconsistent')
  }

  const compatibility = await getCalcomBookingCompatibility(eventTypeId)
  if (!compatibility.compatible) {
    console.warn('Cal.com event type is incompatible with Discuno checkout', {
      eventTypeId,
      reasons: compatibility.reasons,
    })
    throw new BadRequestError(
      'This session is temporarily unavailable while the mentor updates scheduling settings'
    )
  }

  return { mentorConnection, mentorProfile, eventType }
}

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
  const mentorConnection = await getCalcomConnectionByUsername(username)
  const mentorPrefs = await getMentorEnabledEventTypes(mentorConnection.userId)

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
      'cal-api-version': CALCOM_API_VERSIONS.slots,
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
  url?: string
  checkoutSessionId?: string
}> => {
  // Keep a durable actor for abuse prevention and analytics while allowing guests.
  const { user } = await requireAuth()
  const rateLimit = await ratelimit.limit(`checkout:${user.id}`)
  if (!rateLimit.success) throw new BadRequestError('Too many checkout attempts. Please try again.')

  try {
    const validatedInput = BookingFormInputSchema.parse(input)
    const {
      eventTypeId,
      startTimeIso,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      mentorUsername,
      timeZone,
    } = validatedInput
    const { mentorConnection, mentorProfile, eventType } = await resolveBookableEventType(
      mentorUsername,
      eventTypeId
    )
    const mentorUserId = mentorConnection.userId
    const subtotal = eventType.customPrice ?? 0
    const currency = eventType.currency.toUpperCase()

    if (user.id === mentorUserId) {
      throw new BadRequestError('You cannot book your own mentor session')
    }

    console.log('Creating Stripe checkout session for:', {
      mentorUsername,
      attendeeUserId: user.id,
      price: subtotal,
    })

    if (subtotal > 0 && subtotal < MINIMUM_PAID_BOOKING_PRICE) {
      throw new BadRequestError('The minimum price for a paid booking is $5.00.')
    }
    if (subtotal > MAXIMUM_PAID_BOOKING_PRICE) {
      throw new BadRequestError('This session price exceeds the checkout limit')
    }

    if (subtotal === 0) {
      console.log('Skipping Stripe for free booking.')
      throw new BadRequestError('Free bookings should use direct booking flow')
    }

    if (!env.PAYMENTS_ENABLED) {
      throw new BadRequestError('Paid bookings are temporarily unavailable')
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
    if (
      stripeAccountData.stripeAccountStatus !== 'active' ||
      !stripeAccountData.chargesEnabled ||
      !stripeAccountData.payoutsEnabled
    ) {
      throw new BadRequestError('Mentor payments are temporarily unavailable')
    }

    const { mentorFee, menteeFee, mentorAmount } = calculateMarketplaceAmounts(subtotal)
    const payoutEligibleAt = getMentorPayoutEligibleAt(startTimeIso, eventType.duration)
    const bookingAttemptHash = createHash('sha256')
      .update(`${user.id}:${eventTypeId}:${new Date(startTimeIso).toISOString()}`)
      .digest('hex')
    const transferGroup = `discuno_booking_${bookingAttemptHash.slice(0, 40)}`
    const customerId = await getOrCreateStripeCustomerId({
      userId: user.id,
      // A permanent Stripe Customer follows the Discuno account, not mutable
      // booking-recipient fields. Guest identities use the supplied attendee.
      email: user.isAnonymous ? attendeeEmail : user.email,
      name: user.isAnonymous ? attendeeName : user.name,
    })

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
      client_reference_id: bookingAttemptHash,
      // ui_mode: 'hosted', // Default is hosted
      // Discounts and adaptive currency need payout proration; keep launch accounting exact.
      allow_promotion_codes: false,
      consent_collection: {
        promotions: 'auto',
      },
      billing_address_collection: 'required',
      currency: currency.toLowerCase(),
      customer: customerId,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // TODO: discounts
      payment_intent_data: {
        capture_method: 'automatic_async',
        transfer_group: transferGroup,
        metadata: {
          discunoUserId: user.id,
          mentorUserId,
          mentorStripeAccountId: stripeAccountData.stripeAccountId,
          transferGroup,
        },
        receipt_email: attendeeEmail,
        ...(!user.isAnonymous && { setup_future_usage: 'on_session' as const }),
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
      ...(!user.isAnonymous && {
        saved_payment_method_options: {
          allow_redisplay_filters: ['always'] as const,
          payment_method_remove: 'enabled' as const,
          payment_method_save: 'enabled' as const,
        },
      }),
      success_url: `${env.NEXT_PUBLIC_BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/mentor/${mentorUsername}`,

      metadata: {
        mentorUserId: mentorUserId.toString(),
        eventTypeId: eventTypeId.toString(),
        startTime: startTimeIso,
        attendeeName: attendeeName,
        attendeeEmail,
        attendeePhone: attendeePhone ?? '',
        attendeeTimeZone: timeZone,
        mentorUsername: mentorProfile.name ?? mentorUsername,
        actorUserId: user.id,
        eventDurationMinutes: eventType.duration.toString(),
        payoutEligibleAt: payoutEligibleAt.toISOString(),
        transferGroup,
        mentorFee: mentorFee.toString(),
        menteeFee: menteeFee.toString(),
        mentorAmount: mentorAmount.toString(),
        mentorStripeAccountId: stripeAccountData.stripeAccountId,
      },
    }

    const session = await stripe.checkout.sessions.create(createParams, {
      idempotencyKey: `discuno:checkout:v2:${bookingAttemptHash}`,
    })

    console.log(`Successfully created Checkout Session: ${session.id}`)

    if (!session.url) {
      throw new ExternalApiError('Failed to create checkout session URL')
    }

    return {
      success: true,
      url: session.url,
      checkoutSessionId: session.id,
    }
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error)
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Invalid input data.')
    }
    if (error instanceof AppError) throw error

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

  // checkout.session.completed can arrive before delayed payment methods settle.
  // Stripe will later send checkout.session.async_payment_succeeded when paid.
  if (!isCheckoutSessionReadyForFulfillment(session.payment_status)) {
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'payment_not_ready_for_fulfillment',
        sessionId,
        paymentStatus: session.payment_status,
      })
    )
    return new Response('ok', { status: 200 })
  }

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

  const parsedMetadata = CheckoutSessionMetadataSchema.safeParse(metadata)
  if (!parsedMetadata.success) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'error',
        event: 'invalid_metadata',
        sessionId,
        metadata: Object.keys(metadata),
      })
    )
    return new Response(JSON.stringify({ error: 'Invalid checkout metadata' }), { status: 400 })
  }
  const checkoutMetadata = parsedMetadata.data
  const mentorFee = Number.parseInt(checkoutMetadata.mentorFee, 10)
  const menteeFee = Number.parseInt(checkoutMetadata.menteeFee, 10)
  const mentorAmount = Number.parseInt(checkoutMetadata.mentorAmount, 10)
  const durationMinutes = Number.parseInt(checkoutMetadata.eventDurationMinutes, 10)
  const subtotal = session.amount_subtotal
  const expectedMarketplaceAmounts =
    typeof subtotal === 'number' && Number.isSafeInteger(subtotal) && subtotal >= 0
      ? calculateMarketplaceAmounts(subtotal)
      : null

  if (
    typeof subtotal !== 'number' ||
    !expectedMarketplaceAmounts ||
    !Number.isSafeInteger(mentorFee) ||
    !Number.isSafeInteger(menteeFee) ||
    !Number.isSafeInteger(mentorAmount) ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 24 * 60 ||
    menteeFee !== expectedMarketplaceAmounts.menteeFee ||
    mentorFee !== expectedMarketplaceAmounts.mentorFee ||
    mentorAmount !== expectedMarketplaceAmounts.mentorAmount ||
    (session.amount_total ?? -1) < subtotal ||
    !session.currency ||
    session.currency.length !== 3
  ) {
    return new Response(JSON.stringify({ error: 'Checkout amount invariants failed' }), {
      status: 400,
    })
  }

  const disputePeriodEnd = new Date(checkoutMetadata.payoutEligibleAt)
  const expectedPayoutDate = getMentorPayoutEligibleAt(checkoutMetadata.startTime, durationMinutes)
  if (Math.abs(disputePeriodEnd.getTime() - expectedPayoutDate.getTime()) > 1000) {
    return new Response(JSON.stringify({ error: 'Invalid payout eligibility date' }), {
      status: 400,
    })
  }

  const paymentIntentId = getCheckoutPaymentIntentId(session.payment_intent)

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
    mentorUserId: checkoutMetadata.mentorUserId,
    customerEmail: checkoutMetadata.attendeeEmail,
    customerName: checkoutMetadata.attendeeName,
    amount: session.amount_total ?? 0,
    currency: session.currency.toUpperCase(),
    mentorFee,
    menteeFee,
    mentorAmount,
    mentorStripeAccountId: checkoutMetadata.mentorStripeAccountId,
    transferGroup: checkoutMetadata.transferGroup,
    platformStatus: 'SUCCEEDED',
    stripeStatus: session.status ?? undefined,
    disputePeriodEnds: disputePeriodEnd,
    metadata: { checkoutSessionMetadata: checkoutMetadata },
  }

  // Use onConflictDoNothing for idempotency - if Stripe retries webhook, we skip duplicate insert
  const insertedPayments = await db
    .insert(payment)
    .values(insertData)
    .onConflictDoNothing({ target: payment.stripePaymentIntentId })
    .returning()

  const paymentRecord =
    insertedPayments[0] ??
    (
      await db
        .select()
        .from(payment)
        .where(eq(payment.stripePaymentIntentId, paymentIntentId))
        .limit(1)
    )[0]

  if (!paymentRecord) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'critical',
        event: 'payment_record_unavailable',
        sessionId,
        paymentIntentId,
      })
    )
    return new Response('Failed to persist payment', { status: 500 })
  }

  if (
    paymentRecord.stripeCheckoutSessionId !== sessionId ||
    paymentRecord.mentorUserId !== checkoutMetadata.mentorUserId ||
    paymentRecord.amount !== (session.amount_total ?? 0) ||
    paymentRecord.currency !== session.currency.toUpperCase() ||
    paymentRecord.mentorFee !== mentorFee ||
    paymentRecord.menteeFee !== menteeFee ||
    paymentRecord.mentorAmount !== mentorAmount ||
    paymentRecord.transferGroup !== checkoutMetadata.transferGroup
  ) {
    return new Response('Checkout payment conflicts with the stored payment', { status: 409 })
  }

  if (!insertedPayments[0]) {
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
  }

  if (insertedPayments[0]) {
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'payment_record_created',
        sessionId,
        paymentIntentId,
        paymentId: paymentRecord.id,
      })
    )
  }

  if (paymentRecord.fulfillmentQueuedAt) {
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'fulfillment_already_queued',
        sessionId,
        paymentIntentId,
      })
    )
    return new Response('ok', { status: 200 })
  }

  // ============================================
  // STEP 2: DEFERRED SIDE EFFECTS - Trigger Inngest
  // ============================================

  // Trigger Inngest function for side effects (Cal.com booking, PostHog, refunds, emails)
  // Inngest provides automatic retries, observability, and error handling
  try {
    await inngest.send({
      id: getCheckoutFulfillmentEventId(sessionId),
      name: 'stripe/checkout.completed',
      data: {
        paymentId: paymentRecord.id,
        paymentIntentId,
        sessionId,
        metadata: {
          mentorUserId: checkoutMetadata.mentorUserId,
          eventTypeId: checkoutMetadata.eventTypeId,
          startTime: checkoutMetadata.startTime,
          attendeeName: checkoutMetadata.attendeeName,
          attendeeEmail: checkoutMetadata.attendeeEmail,
          attendeePhone: checkoutMetadata.attendeePhone,
          attendeeTimeZone: checkoutMetadata.attendeeTimeZone,
          mentorUsername: checkoutMetadata.mentorUsername,
          mentorFee: checkoutMetadata.mentorFee,
          menteeFee: checkoutMetadata.menteeFee,
          mentorAmount: checkoutMetadata.mentorAmount,
          mentorStripeAccountId: checkoutMetadata.mentorStripeAccountId,
          actorUserId: checkoutMetadata.actorUserId,
          eventDurationMinutes: checkoutMetadata.eventDurationMinutes,
          payoutEligibleAt: checkoutMetadata.payoutEligibleAt,
          transferGroup: checkoutMetadata.transferGroup,
        },
        sessionAmount: session.amount_total,
        sessionCurrency: session.currency,
      },
    })
    await db
      .update(payment)
      .set({ fulfillmentQueuedAt: new Date(), updatedAt: new Date() })
      .where(eq(payment.id, paymentRecord.id))
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
