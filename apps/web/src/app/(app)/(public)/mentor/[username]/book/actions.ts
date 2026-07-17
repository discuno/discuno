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
import { getSafeErrorName } from '~/lib/operational-logging'
import {
  checkoutIpRatelimit,
  freeBookingActorRatelimit,
  freeBookingIpRatelimit,
  ratelimit,
  slotLookupIpRatelimit,
} from '~/lib/rate-limiter'
import { stripe } from '~/lib/stripe'
import {
  getCheckoutFulfillmentEventId,
  getCheckoutPaymentIntentId,
  isDefinitiveStripeCheckoutExpiryError,
  isCheckoutSessionReadyForFulfillment,
} from '~/lib/stripe/checkout'
import { getOrCreateStripeCustomerId } from '~/lib/stripe/customer'
import { calculateMarketplaceAmounts, getMentorPayoutEligibleAt } from '~/lib/stripe/marketplace'
import { createCheckoutWithReservedSlot } from '~/lib/services/checkout-slot-reservation'
import { db } from '~/server/db'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'
import { mentorStripeAccount, payment } from '~/server/db/schema/index'
import { getCalcomConnectionByUsername } from '~/server/queries/calcom'
import { getMentorEnabledEventTypes } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

const EventTypeIdSchema = z.number().int().positive('Event type ID must be a positive integer')
const createOperationalReference = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16)
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
const AttendeePhoneSchema = z
  .string()
  .trim()
  .transform(value => value.replace(/[\s\-().]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must include a valid international country code')
  )
const AttendeeTopicSchema = z
  .string()
  .trim()
  .min(3, 'Tell the mentor what you would like to talk through')
  .max(200, 'Your question must be at most 200 characters')
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
  bookingAttemptId: z.uuid(),
  attendee: z.object({
    name: AttendeeNameSchema,
    email: AttendeeEmailSchema,
    phone: AttendeePhoneSchema,
    topic: AttendeeTopicSchema,
    timeZone: TimeZoneSchema.optional(),
  }),
})

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>

export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  // Anonymous sessions provide an actor ID and CSRF-protected server-action boundary
  // without forcing account creation during checkout.
  const { user } = await requireAuth()
  const requestHeaders = await headers()
  const trustedIp = requestHeaders.get('x-vercel-forwarded-for')?.trim()
  const ipFingerprint = trustedIp ? createHash('sha256').update(trustedIp).digest('hex') : null
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

  const { eventTypeId, startTime, bookingAttemptId, attendee, username } = validatedInput.data
  const { mentorConnection, eventType } = await resolveBookableEventType(username, eventTypeId)

  if ((eventType.customPrice ?? 0) > 0) {
    throw new BadRequestError('Paid sessions must use secure checkout')
  }
  if (user.id === mentorConnection.userId) {
    throw new BadRequestError('You cannot book your own mentor session')
  }

  const booking = await createCalcomBooking({
    calcomEventTypeId: eventTypeId,
    start: startTime,
    attendeeName: attendee.name,
    attendeeEmail: attendee.email,
    attendeePhone: attendee.phone,
    bookingTitle: attendee.topic,
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
  attendeePhone: AttendeePhoneSchema,
  attendeeTopic: AttendeeTopicSchema,
  mentorUsername: MentorUsernameSchema,
  timeZone: TimeZoneSchema,
  bookingAttemptId: z.uuid(),
})

const CheckoutSessionMetadataSchema = z.object({
  mentorUserId: z.uuid(),
  eventTypeId: z.string().regex(/^\d+$/),
  startTime: z.iso.datetime(),
  attendeeName: AttendeeNameSchema,
  attendeeEmail: AttendeeEmailSchema,
  attendeePhone: z.string().max(50),
  attendeeTopic: AttendeeTopicSchema.optional(),
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
  // Checkout Sessions opened before booking-attempt IDs were introduced can
  // still complete during rollout. Paid fulfillment is idempotent by the
  // Stripe session/payment IDs and Cal.com payment metadata, so this field is
  // not part of the financial trust boundary.
  bookingAttemptId: z.uuid().optional(),
  calcomReservationUid: z.uuid().optional(),
  calcomReservationUntil: z.iso.datetime().optional(),
  checkoutReservationGeneration: z.string().regex(/^\d+$/).optional(),
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

  const compatibility = await getCalcomBookingCompatibility(eventTypeId, mentorConnection.userId)
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

const AvailableSlotsResponseSchema = z.object({
  status: z.literal('success'),
  data: z.record(
    z.string(),
    z.array(
      z.object({
        start: z.iso.datetime({ offset: true }),
      })
    )
  ),
})

/**
 * Fetch available event types for a given username (using database with joins)
 */
export const fetchEventTypes = async (username: string): Promise<EventType[]> => {
  const mentorConnection = await getCalcomConnectionByUsername(username)
  const mentorPrefs = await getMentorEnabledEventTypes(mentorConnection.userId)

  if (!mentorPrefs.length) {
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
  const parsedEventTypeId = EventTypeIdSchema.safeParse(eventTypeId)
  const parsedTimeZone = timeZone ? TimeZoneSchema.safeParse(timeZone) : null
  const start = new Date(startDate)
  const end = new Date(endDate)
  // A 31-day local calendar month can span 31 days plus one hour when it
  // contains a daylight-saving fall-back. Keep the boundary below 32 full
  // days while allowing that legitimate provider request.
  const maximumRangeMsExclusive = 32 * 24 * 60 * 60 * 1000
  if (
    !parsedEventTypeId.success ||
    (parsedTimeZone && !parsedTimeZone.success) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    end.getTime() - start.getTime() >= maximumRangeMsExclusive
  ) {
    throw new BadRequestError('Invalid availability range')
  }

  const requestHeaders = await headers()
  const trustedIp = requestHeaders.get('x-vercel-forwarded-for')?.trim()
  if (trustedIp) {
    const ipFingerprint = createHash('sha256').update(trustedIp).digest('hex')
    const rateLimit = await slotLookupIpRatelimit.limit(ipFingerprint)
    if (!rateLimit.success) throw new BadRequestError('Too many availability requests')
  }

  const apiBase = `${env.CALCOM_API_URL.replace(/\/+$/, '')}/`
  const url = new URL('slots', apiBase)
  url.searchParams.set('eventTypeId', parsedEventTypeId.data.toString())
  url.searchParams.set('start', start.toISOString())
  url.searchParams.set('end', end.toISOString())
  if (parsedTimeZone?.success) url.searchParams.set('timeZone', parsedTimeZone.data)

  const response = await fetch(url.toString(), {
    headers: {
      'cal-api-version': CALCOM_API_VERSIONS.slots,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    console.error('Cal.com slot lookup failed', { status: response.status })
    throw new ExternalApiError(`Failed to fetch slots (${response.status})`)
  }

  const data = AvailableSlotsResponseSchema.safeParse(await response.json().catch(() => undefined))
  if (!data.success) {
    throw new ExternalApiError('Invalid slots response')
  }

  const availableSlots: Record<string, TimeSlot[]> = {}

  for (const dateKey in data.data.data) {
    const slots = data.data.data[dateKey]
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
  const requestHeaders = await headers()
  const trustedIp = requestHeaders.get('x-vercel-forwarded-for')?.trim()
  const ipFingerprint = trustedIp ? createHash('sha256').update(trustedIp).digest('hex') : null
  const [actorLimit, ipLimit] = await Promise.all([
    ratelimit.limit(`checkout:${user.id}`),
    ipFingerprint ? checkoutIpRatelimit.limit(ipFingerprint) : Promise.resolve({ success: true }),
  ])
  if (!actorLimit.success || !ipLimit.success) {
    throw new BadRequestError('Too many checkout attempts. Please try again.')
  }

  try {
    const validatedInput = BookingFormInputSchema.parse(input)
    const {
      eventTypeId,
      startTimeIso,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      attendeeTopic,
      mentorUsername,
      timeZone,
      bookingAttemptId,
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
      console.warn('Stripe checkout unavailable because payout setup is incomplete')
      throw new BadRequestError('Mentor has not set up payments')
    }

    const stripeAccountData = stripeAccount[0]
    if (
      stripeAccountData.stripeAccountStatus !== 'active' ||
      !(stripeAccountData.transfersEnabled ?? stripeAccountData.payoutsEnabled) ||
      !stripeAccountData.payoutsEnabled
    ) {
      throw new BadRequestError('Mentor payments are temporarily unavailable')
    }

    const { mentorFee, menteeFee, mentorAmount } = calculateMarketplaceAmounts(subtotal)
    const payoutEligibleAt = getMentorPayoutEligibleAt(startTimeIso, eventType.duration)
    const checkoutReference = createOperationalReference(bookingAttemptId)
    console.info('Stripe checkout creation started', { checkoutReference })
    const customerId = await getOrCreateStripeCustomerId({
      userId: user.id,
      // A permanent Stripe Customer follows the Discuno account, not mutable
      // booking-recipient fields. Guest identities use the supplied attendee.
      email: user.isAnonymous ? attendeeEmail : user.email,
      name: user.isAnonymous ? attendeeName : user.name,
    })

    const session = await createCheckoutWithReservedSlot({
      bookingAttemptId,
      actorUserId: user.id,
      mentorUserId,
      eventTypeId,
      startTime: startTimeIso,
      durationMinutes: eventType.duration,
      retrieveSession: sessionId => stripe.checkout.sessions.retrieve(sessionId),
      expireSession: sessionId => stripe.checkout.sessions.expire(sessionId),
      buildCheckoutRequest: ({
        reservationUid,
        reservationUntil,
        checkoutExpiresAt,
        generation,
      }) => {
        const generationHash = createHash('sha256')
          .update(`${bookingAttemptId}:${generation}`)
          .digest('hex')
        const transferGroup = `discuno_booking_${generationHash.slice(0, 40)}`
        const cancelUrl = new URL('/booking/cancel', env.NEXT_PUBLIC_BASE_URL)
        cancelUrl.searchParams.set('attempt', bookingAttemptId)
        cancelUrl.searchParams.set('generation', generation.toString())
        cancelUrl.searchParams.set('returnTo', `/mentor/${mentorUsername}`)

        const params: Stripe.Checkout.SessionCreateParams = {
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
                    attendeeName,
                  },
                },
                unit_amount: subtotal,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          payment_method_types: ['card'],
          client_reference_id: generationHash,
          allow_promotion_codes: false,
          consent_collection: { promotions: 'auto' },
          billing_address_collection: 'required',
          currency: currency.toLowerCase(),
          customer: customerId,
          customer_update: { address: 'auto', name: 'auto' },
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
            statement_descriptor_suffix: 'MENTOR SESSION',
          },
          invoice_creation: {
            enabled: true,
            invoice_data: { issuer: { type: 'self' } },
          },
          payment_method_options: { card: {} },
          ...(!user.isAnonymous && {
            saved_payment_method_options: {
              allow_redisplay_filters: ['always'] as const,
              payment_method_remove: 'enabled' as const,
              payment_method_save: 'enabled' as const,
            },
          }),
          // Keep Stripe's Session ID out of browser-visible URLs. The durable
          // attempt resolves its bound Session server-side on the result page.
          success_url: `${env.NEXT_PUBLIC_BASE_URL}/booking/success?attempt=${bookingAttemptId}`,
          cancel_url: cancelUrl.toString(),
          expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
          metadata: {
            mentorUserId: mentorUserId.toString(),
            eventTypeId: eventTypeId.toString(),
            startTime: startTimeIso,
            attendeeName,
            attendeeEmail,
            attendeePhone,
            attendeeTopic,
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
            bookingAttemptId,
            checkoutReservationGeneration: generation.toString(),
            calcomReservationUid: reservationUid,
            calcomReservationUntil: reservationUntil.toISOString(),
          },
        }

        // Persist the exact per-generation request before Stripe sees it. JSON
        // normalization removes undefined fields and makes an ambiguous replay
        // byte-for-byte parameter stable.
        return JSON.parse(JSON.stringify(params)) as Record<string, unknown>
      },
      createSession: ({ checkoutRequest, idempotencyKey }) =>
        stripe.checkout.sessions.create(checkoutRequest, {
          idempotencyKey,
        }),
      isDefinitiveCheckoutExpiryError: isDefinitiveStripeCheckoutExpiryError,
    })

    console.info('Stripe checkout session created', { checkoutReference })

    if (!session.url) {
      throw new ExternalApiError('Failed to create checkout session URL')
    }

    return {
      success: true,
      url: session.url,
      checkoutSessionId: session.id,
    }
  } catch (error) {
    console.error('Stripe checkout session creation failed', {
      errorName: getSafeErrorName(error),
    })
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Invalid input data.')
    }
    if (error instanceof AppError) throw error

    // Handle specific Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; code?: string }

      // Handle insufficient capabilities error specifically
      if (stripeError.code === 'insufficient_capabilities_for_transfer') {
        throw new StripeError(
          "The mentor's payment account needs additional capabilities to receive transfers. Please contact the mentor to complete their payment setup."
        )
      }

      // Handle other specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        throw new StripeError('Stripe could not start this payment. Please try again.')
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
  const sessionReference = createOperationalReference(sessionId)

  // checkout.session.completed can arrive before delayed payment methods settle.
  // Stripe will later send checkout.session.async_payment_succeeded when paid.
  if (!isCheckoutSessionReadyForFulfillment(session.payment_status)) {
    console.info(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'info',
        event: 'payment_not_ready_for_fulfillment',
        sessionReference,
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
        sessionReference,
      })
    )
    return new Response(JSON.stringify({ error: 'Missing metadata' }), { status: 400 })
  }

  console.info(
    JSON.stringify({
      tag: 'CheckoutWebhook',
      level: 'info',
      event: 'webhook_received',
      sessionReference,
    })
  )

  const parsedMetadata = CheckoutSessionMetadataSchema.safeParse(metadata)
  if (!parsedMetadata.success) {
    console.error(
      JSON.stringify({
        tag: 'CheckoutWebhook',
        level: 'error',
        event: 'invalid_metadata',
        sessionReference,
        metadataKeyCount: Object.keys(metadata).length,
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
        sessionReference,
      })
    )
    return new Response(JSON.stringify({ error: 'Missing payment intent id' }), { status: 400 })
  }
  const paymentIntentReference = createOperationalReference(paymentIntentId)
  const canonicalActorUserId = await resolveCanonicalUserId(checkoutMetadata.actorUserId)
  const persistedCheckoutMetadata = {
    ...checkoutMetadata,
    // Keep the captured UUID when the account is genuinely gone. Payment JSON
    // has no user FK, and fulfillment resolves it to null before attendee insert.
    actorUserId: canonicalActorUserId ?? checkoutMetadata.actorUserId,
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
    metadata: { checkoutSessionMetadata: persistedCheckoutMetadata },
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
        sessionReference,
        paymentIntentReference,
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
        sessionReference,
        paymentIntentReference,
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
        sessionReference,
        paymentIntentReference,
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
        sessionReference,
        paymentIntentReference,
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
        sessionReference,
        paymentIntentReference,
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
        sessionReference,
        paymentIntentReference,
        errorName: getSafeErrorName(inngestError),
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
      sessionReference,
    })
  )
  return new Response('ok', { status: 200 })
}
