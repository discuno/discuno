import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const dbQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }

  return {
    checkoutIpRateLimit: vi.fn(),
    createCheckoutWithReservedSlot: vi.fn(),
    createCheckoutSession: vi.fn(),
    dbQuery,
    dbSelect: vi.fn(),
    env: {
      NEXT_PUBLIC_BASE_URL: 'https://preview.discuno.test',
      CALCOM_API_URL: 'https://api.cal.com/v2',
      PAYMENTS_ENABLED: false,
    },
    fetch: vi.fn(),
    getCalcomBookingCompatibility: vi.fn(),
    getCalcomConnectionByUsername: vi.fn(),
    getMentorEnabledEventTypes: vi.fn(),
    getOrCreateStripeCustomerId: vi.fn(),
    getPublicProfileByUsername: vi.fn(),
    headers: vi.fn(),
    rateLimit: vi.fn(),
    requireAuth: vi.fn(),
    slotRateLimit: vi.fn(),
  }
})

vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('~/env', () => ({ env: mocks.env }))
vi.mock('~/inngest/client', () => ({ inngest: { send: vi.fn() } }))
vi.mock('~/lib/auth/auth-utils', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('~/lib/calcom', () => ({
  createCalcomBooking: vi.fn(),
  getCalcomBookingCompatibility: mocks.getCalcomBookingCompatibility,
}))
vi.mock('~/lib/rate-limiter', () => ({
  checkoutIpRatelimit: { limit: mocks.checkoutIpRateLimit },
  freeBookingActorRatelimit: { limit: vi.fn() },
  freeBookingIpRatelimit: { limit: vi.fn() },
  ratelimit: { limit: mocks.rateLimit },
  slotLookupIpRatelimit: { limit: mocks.slotRateLimit },
}))
vi.mock('~/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: mocks.createCheckoutSession } } },
}))
vi.mock('~/lib/stripe/customer', () => ({
  getOrCreateStripeCustomerId: mocks.getOrCreateStripeCustomerId,
}))
vi.mock('~/lib/services/checkout-slot-reservation', () => ({
  createCheckoutWithReservedSlot: mocks.createCheckoutWithReservedSlot,
}))
vi.mock('~/server/db', () => ({ db: { select: mocks.dbSelect } }))
vi.mock('~/server/queries/calcom', () => ({
  getCalcomConnectionByUsername: mocks.getCalcomConnectionByUsername,
}))
vi.mock('~/server/queries/event-types', () => ({
  getMentorEnabledEventTypes: mocks.getMentorEnabledEventTypes,
}))
vi.mock('~/server/queries/profiles', () => ({
  getPublicProfileByUsername: mocks.getPublicProfileByUsername,
}))

import {
  createStripeCheckoutSession,
  fetchAvailableSlots,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'

const attendeeUserId = '11111111-1111-4111-8111-111111111111'
const mentorUserId = '22222222-2222-4222-8222-222222222222'
const input = {
  bookingAttemptId: '33333333-3333-4333-8333-333333333333',
  eventTypeId: 42,
  startTimeIso: '2099-01-02T15:00:00.000Z',
  attendeeName: 'Test Student',
  attendeeEmail: 'student@example.edu',
  attendeePhone: '+1 555 010 9999',
  attendeeTopic: 'Choosing between two majors',
  mentorUsername: 'test-mentor',
  timeZone: 'America/New_York',
}

describe('paid booking launch switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.PAYMENTS_ENABLED = false
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.headers.mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': '203.0.113.10' }))
    mocks.slotRateLimit.mockResolvedValue({ success: true })
    mocks.requireAuth.mockResolvedValue({
      user: {
        id: attendeeUserId,
        email: 'student@example.edu',
        name: 'Test Student',
        isAnonymous: false,
      },
    })
    mocks.rateLimit.mockResolvedValue({ success: true })
    mocks.checkoutIpRateLimit.mockResolvedValue({ success: true })
    mocks.getPublicProfileByUsername.mockResolvedValue({
      userId: mentorUserId,
      calcomUsername: 'test-mentor',
      name: 'Test Mentor',
    })
    mocks.getCalcomBookingCompatibility.mockResolvedValue({ compatible: true, reasons: [] })
    mocks.getCalcomConnectionByUsername.mockResolvedValue({ userId: mentorUserId })
    mocks.getMentorEnabledEventTypes.mockResolvedValue([
      {
        calcomEventTypeId: 42,
        title: 'Mentor session',
        description: null,
        duration: 30,
        customPrice: 2500,
        currency: 'USD',
      },
    ])

    mocks.dbQuery.from.mockReturnValue(mocks.dbQuery)
    mocks.dbQuery.where.mockReturnValue(mocks.dbQuery)
    mocks.dbQuery.limit.mockResolvedValue([
      {
        stripeAccountId: 'acct_discuno_test_mentor',
        stripeAccountStatus: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      },
    ])
    mocks.dbSelect.mockReturnValue(mocks.dbQuery)
    mocks.getOrCreateStripeCustomerId.mockResolvedValue('cus_discuno_test_student')
    mocks.createCheckoutSession.mockResolvedValue({
      id: 'cs_test_discuno_switch',
      url: 'https://checkout.stripe.test/c/pay/cs_test_discuno_switch',
    })
    mocks.createCheckoutWithReservedSlot.mockImplementation(
      ({ bookingAttemptId, buildCheckoutRequest, createSession }) => {
        const context = {
          reservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
          reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
          checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
          generation: 1,
        }
        return createSession({
          checkoutRequest: buildCheckoutRequest(context),
          idempotencyKey: `discuno:checkout:v4:${bookingAttemptId}:1`,
          generation: 1,
        })
      }
    )

    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('blocks Stripe customer and Checkout mutations when disabled', async () => {
    await expect(createStripeCheckoutSession(input)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Paid bookings are temporarily unavailable',
      statusCode: 400,
    })

    expect(mocks.dbSelect).not.toHaveBeenCalled()
    expect(mocks.getOrCreateStripeCustomerId).not.toHaveBeenCalled()
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('permits the server-authoritative Checkout path when enabled', async () => {
    mocks.env.PAYMENTS_ENABLED = true

    await expect(createStripeCheckoutSession(input)).resolves.toEqual({
      success: true,
      url: 'https://checkout.stripe.test/c/pay/cs_test_discuno_switch',
      checkoutSessionId: 'cs_test_discuno_switch',
    })

    expect(mocks.getOrCreateStripeCustomerId).toHaveBeenCalledOnce()
    expect(mocks.createCheckoutSession).toHaveBeenCalledOnce()
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: `https://preview.discuno.test/booking/success?attempt=${input.bookingAttemptId}`,
      }),
      expect.anything()
    )
    expect(JSON.stringify(mocks.createCheckoutSession.mock.calls[0]?.[0])).not.toContain(
      '{CHECKOUT_SESSION_ID}'
    )

    const logs = JSON.stringify([
      ...vi.mocked(console.log).mock.calls,
      ...vi.mocked(console.info).mock.calls,
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ])
    for (const privateValue of [
      attendeeUserId,
      mentorUserId,
      input.attendeeEmail,
      input.attendeeName,
      input.attendeePhone,
      input.attendeeTopic,
      input.mentorUsername,
      'acct_discuno_test_mentor',
      'cus_discuno_test_student',
      'cs_test_discuno_switch',
    ]) {
      expect(logs).not.toContain(privateValue)
    }
    expect(logs).toContain('checkoutReference')
  })

  it('redacts raw provider failures from Checkout logs', async () => {
    mocks.env.PAYMENTS_ENABLED = true
    const privateError = 'sk_live_private for student@example.edu'
    mocks.createCheckoutSession.mockRejectedValue(
      Object.assign(new Error(privateError), { type: 'StripeInvalidRequestError' })
    )

    await expect(createStripeCheckoutSession(input)).rejects.toMatchObject({
      code: 'STRIPE_ERROR',
      message: 'Stripe could not start this payment. Please try again.',
    })

    const logs = JSON.stringify([
      ...vi.mocked(console.log).mock.calls,
      ...vi.mocked(console.info).mock.calls,
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ])
    expect(logs).not.toContain(privateError)
    expect(logs).not.toContain(input.attendeeEmail)
    expect(logs).not.toContain('sk_live_private')
    expect(logs).toContain('errorName')
    expect(logs).toContain('Error')
  })

  it('rejects an incompatible Cal.com event type before payment mutations', async () => {
    mocks.env.PAYMENTS_ENABLED = true
    mocks.getCalcomBookingCompatibility.mockResolvedValue({
      compatible: false,
      reasons: ['email_verification_required'],
    })

    await expect(createStripeCheckoutSession(input)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'This session is temporarily unavailable while the mentor updates scheduling settings',
      statusCode: 400,
    })

    expect(mocks.getCalcomBookingCompatibility).toHaveBeenCalledWith(42, mentorUserId)
    expect(mocks.dbSelect).not.toHaveBeenCalled()
    expect(mocks.getOrCreateStripeCustomerId).not.toHaveBeenCalled()
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('accepts an ISO time zone offset and canonicalizes the instant to UTC', async () => {
    mocks.env.PAYMENTS_ENABLED = true

    await expect(
      createStripeCheckoutSession({
        ...input,
        startTimeIso: '2099-01-02T10:00:00.000-05:00',
      })
    ).resolves.toMatchObject({ success: true })

    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: expect.objectContaining({
                metadata: expect.objectContaining({
                  startTime: '2099-01-02T15:00:00.000Z',
                }),
              }),
            }),
          }),
        ],
        metadata: expect.objectContaining({
          startTime: '2099-01-02T15:00:00.000Z',
          calcomReservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
          attendeeTopic: input.attendeeTopic,
        }),
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^discuno:checkout:v4:/),
      })
    )
  })
})

describe('public Cal.com slot lookup boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.headers.mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': '203.0.113.10' }))
    mocks.slotRateLimit.mockResolvedValue({ success: true })
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            '2099-01-02': [{ start: '2099-01-02T15:00:00.000Z' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('validates, rate-limits, and parses current slot responses', async () => {
    await expect(
      fetchAvailableSlots(
        42,
        new Date('2099-01-01T00:00:00.000Z'),
        new Date('2099-01-31T00:00:00.000Z'),
        'America/New_York'
      )
    ).resolves.toEqual({
      '2099-01-02': [{ time: '2099-01-02T15:00:00.000Z', available: true }],
    })

    expect(mocks.slotRateLimit).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/))
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.cal.com/v2/slots?'),
      expect.objectContaining({
        cache: 'no-store',
        headers: { 'cal-api-version': '2024-09-04' },
      })
    )
  })

  it('rejects oversized date ranges before contacting Cal.com', async () => {
    await expect(
      fetchAvailableSlots(
        42,
        new Date('2099-01-01T00:00:00.000Z'),
        new Date('2099-02-02T00:00:00.000Z'),
        'UTC'
      )
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 })

    expect(mocks.headers).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('accepts a 31-day local month that includes a daylight-saving fall-back', async () => {
    await expect(
      fetchAvailableSlots(
        42,
        new Date('2026-10-01T00:00:00.000+01:00'),
        new Date('2026-10-31T23:59:59.999+00:00'),
        'Europe/London'
      )
    ).resolves.toEqual({
      '2099-01-02': [{ time: '2099-01-02T15:00:00.000Z', available: true }],
    })

    expect(mocks.fetch).toHaveBeenCalledOnce()
  })

  it('stops abusive slot polling before the upstream request', async () => {
    mocks.slotRateLimit.mockResolvedValue({ success: false })

    await expect(
      fetchAvailableSlots(
        42,
        new Date('2099-01-01T00:00:00.000Z'),
        new Date('2099-01-31T00:00:00.000Z'),
        'UTC'
      )
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 })

    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
