import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const dbQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }

  return {
    createCheckoutSession: vi.fn(),
    dbQuery,
    dbSelect: vi.fn(),
    env: {
      NEXT_PUBLIC_BASE_URL: 'https://preview.discuno.test',
      NEXT_PUBLIC_CALCOM_API_URL: 'https://api.cal.com/v2',
      PAYMENTS_ENABLED: false,
    },
    getCalcomConnectionByUsername: vi.fn(),
    getMentorEnabledEventTypes: vi.fn(),
    getOrCreateStripeCustomerId: vi.fn(),
    getPublicProfileByUsername: vi.fn(),
    rateLimit: vi.fn(),
    requireAuth: vi.fn(),
  }
})

vi.mock('~/env', () => ({ env: mocks.env }))
vi.mock('~/inngest/client', () => ({ inngest: { send: vi.fn() } }))
vi.mock('~/lib/auth/auth-utils', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('~/lib/calcom', () => ({ createCalcomBooking: vi.fn() }))
vi.mock('~/lib/rate-limiter', () => ({
  freeBookingActorRatelimit: { limit: vi.fn() },
  freeBookingIpRatelimit: { limit: vi.fn() },
  ratelimit: { limit: mocks.rateLimit },
}))
vi.mock('~/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: mocks.createCheckoutSession } } },
}))
vi.mock('~/lib/stripe/customer', () => ({
  getOrCreateStripeCustomerId: mocks.getOrCreateStripeCustomerId,
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

import { createStripeCheckoutSession } from '~/app/(app)/(public)/mentor/[username]/book/actions'

const attendeeUserId = '11111111-1111-4111-8111-111111111111'
const mentorUserId = '22222222-2222-4222-8222-222222222222'
const input = {
  eventTypeId: 42,
  startTimeIso: '2099-01-02T15:00:00.000Z',
  attendeeName: 'Test Student',
  attendeeEmail: 'student@example.edu',
  attendeePhone: '+1 555 010 9999',
  mentorUsername: 'test-mentor',
  timeZone: 'America/New_York',
}

describe('paid booking launch switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.PAYMENTS_ENABLED = false
    mocks.requireAuth.mockResolvedValue({
      user: {
        id: attendeeUserId,
        email: 'student@example.edu',
        name: 'Test Student',
        isAnonymous: false,
      },
    })
    mocks.rateLimit.mockResolvedValue({ success: true })
    mocks.getPublicProfileByUsername.mockResolvedValue({
      userId: mentorUserId,
      calcomUsername: 'test-mentor',
      name: 'Test Mentor',
    })
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

    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
  })
})
