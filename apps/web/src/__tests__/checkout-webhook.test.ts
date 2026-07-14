import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  inngestSend: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers: vi.fn() }))

vi.mock('~/env', () => ({
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://discuno.test',
    NEXT_PUBLIC_CALCOM_API_URL: 'https://api.cal.test/v2',
  },
}))

vi.mock('~/inngest/client', () => ({
  inngest: { send: mocks.inngestSend },
}))

vi.mock('~/lib/auth/auth-utils', () => ({ requireAuth: vi.fn() }))
vi.mock('~/lib/calcom', () => ({ createCalcomBooking: vi.fn() }))
vi.mock('~/lib/calcom/client', () => ({
  CALCOM_API_VERSIONS: { slots: '2024-09-04' },
}))
vi.mock('~/lib/rate-limiter', () => ({
  freeBookingActorRatelimit: { limit: vi.fn() },
  freeBookingIpRatelimit: { limit: vi.fn() },
  ratelimit: { limit: vi.fn() },
}))
vi.mock('~/lib/stripe', () => ({ stripe: {} }))
vi.mock('~/lib/stripe/customer', () => ({ getOrCreateStripeCustomerId: vi.fn() }))
vi.mock('~/server/queries/calcom', () => ({ getCalcomConnectionByUsername: vi.fn() }))
vi.mock('~/server/queries/event-types', () => ({ getMentorEnabledEventTypes: vi.fn() }))
vi.mock('~/server/queries/profiles', () => ({ getPublicProfileByUsername: vi.fn() }))

vi.mock('~/server/db', () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
  },
}))

import { handleCheckoutSessionWebhook } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  getCheckoutFulfillmentEventId,
  getCheckoutPaymentIntentId,
  isCheckoutSessionReadyForFulfillment,
} from '~/lib/stripe/checkout'

const mentorUserId = '11111111-1111-4111-8111-111111111111'
const actorUserId = '22222222-2222-4222-8222-222222222222'
const sessionId = 'cs_test_discuno'
const paymentIntentId = 'pi_test_discuno'
const transferGroup = 'discuno_booking_1234567890abcdef'

const createCheckoutSession = (
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session =>
  ({
    id: sessionId,
    object: 'checkout.session',
    payment_status: 'paid',
    payment_intent: paymentIntentId,
    status: 'complete',
    amount_subtotal: 5_000,
    amount_total: 5_400,
    currency: 'usd',
    metadata: {
      mentorUserId,
      eventTypeId: '456',
      startTime: '2030-01-01T12:00:00.000Z',
      attendeeName: 'Mentee Name',
      attendeeEmail: 'mentee@example.edu',
      attendeePhone: '',
      attendeeTimeZone: 'America/New_York',
      mentorUsername: 'Mentor Name',
      actorUserId,
      eventDurationMinutes: '60',
      payoutEligibleAt: '2030-01-04T13:00:00.000Z',
      transferGroup,
      mentorFee: '750',
      menteeFee: '0',
      mentorAmount: '4250',
      mentorStripeAccountId: 'acct_discuno_mentor',
    },
    ...overrides,
  }) as Stripe.Checkout.Session

const createPaymentRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  stripeCheckoutSessionId: sessionId,
  stripePaymentIntentId: paymentIntentId,
  mentorUserId,
  amount: 5_400,
  currency: 'USD',
  mentorFee: 750,
  menteeFee: 0,
  mentorAmount: 4_250,
  transferGroup,
  fulfillmentQueuedAt: null,
  ...overrides,
})

const mockInsertResult = (records: ReturnType<typeof createPaymentRecord>[]) => {
  const returning = vi.fn().mockResolvedValue(records)
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning })
  const values = vi.fn().mockReturnValue({ onConflictDoNothing })
  mocks.insert.mockReturnValue({ values })
  return { onConflictDoNothing, returning, values }
}

const mockSelectResult = (records: ReturnType<typeof createPaymentRecord>[]) => {
  const limit = vi.fn().mockResolvedValue(records)
  const where = vi.fn().mockReturnValue({ limit })
  const from = vi.fn().mockReturnValue({ where })
  mocks.select.mockReturnValue({ from })
  return { from, limit, where }
}

const mockUpdateResult = () => {
  const where = vi.fn().mockResolvedValue([])
  const set = vi.fn().mockReturnValue({ where })
  mocks.update.mockReturnValue({ set })
  return { set, where }
}

describe('Stripe Checkout fulfillment helpers', () => {
  it('fulfills paid and no-payment sessions', () => {
    expect(isCheckoutSessionReadyForFulfillment('paid')).toBe(true)
    expect(isCheckoutSessionReadyForFulfillment('no_payment_required')).toBe(true)
  })

  it('waits for the async success event when a session is unpaid', () => {
    expect(isCheckoutSessionReadyForFulfillment('unpaid')).toBe(false)
  })

  it('uses a deterministic Inngest event ID for webhook retries', () => {
    expect(getCheckoutFulfillmentEventId('cs_test_123')).toBe('stripe-checkout-cs_test_123')
    expect(getCheckoutFulfillmentEventId('cs_test_123')).toBe(
      getCheckoutFulfillmentEventId('cs_test_123')
    )
  })

  it('extracts expanded and unexpanded payment intent IDs', () => {
    expect(getCheckoutPaymentIntentId('pi_test_123')).toBe('pi_test_123')
    expect(getCheckoutPaymentIntentId({ id: 'pi_test_456' })).toBe('pi_test_456')
    expect(getCheckoutPaymentIntentId(null)).toBeNull()
  })
})

describe('Stripe Checkout webhook boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.inngestSend.mockResolvedValue({ ids: ['event-id'] })
  })

  it('acknowledges an unpaid session without persisting or queueing fulfillment', async () => {
    const response = await handleCheckoutSessionWebhook(
      createCheckoutSession({ payment_status: 'unpaid' })
    )

    expect(response.status).toBe(200)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('rejects missing or malformed metadata before touching the ledger', async () => {
    const missing = await handleCheckoutSessionWebhook(createCheckoutSession({ metadata: null }))
    const malformed = await handleCheckoutSessionWebhook(
      createCheckoutSession({
        metadata: {
          ...createCheckoutSession().metadata,
          mentorUserId: 'not-a-user-id',
        },
      })
    )

    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: 'Missing metadata' })
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toEqual({ error: 'Invalid checkout metadata' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it.each([
    ['a buyer fee', { menteeFee: '1', mentorAmount: '4249' }],
    ['a non-15% platform commission', { mentorFee: '700', mentorAmount: '4300' }],
    ['an amount split that does not equal the subtotal', { mentorAmount: '4249' }],
  ])('rejects metadata containing %s', async (_description, metadataOverride) => {
    const baseSession = createCheckoutSession()
    const response = await handleCheckoutSessionWebhook(
      createCheckoutSession({
        metadata: { ...baseSession.metadata, ...metadataOverride },
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Checkout amount invariants failed' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('rejects a payout date that is not session end plus 72 hours', async () => {
    const baseSession = createCheckoutSession()
    const response = await handleCheckoutSessionWebhook(
      createCheckoutSession({
        metadata: {
          ...baseSession.metadata,
          payoutEligibleAt: '2030-01-04T12:59:58.000Z',
        },
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid payout eligibility date' })
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('persists validated server accounting and queues one deterministic fulfillment event', async () => {
    const insert = mockInsertResult([createPaymentRecord()])
    const update = mockUpdateResult()

    const response = await handleCheckoutSessionWebhook(createCheckoutSession())

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        amount: 5_400,
        currency: 'USD',
        mentorFee: 750,
        menteeFee: 0,
        mentorAmount: 4_250,
        mentorStripeAccountId: 'acct_discuno_mentor',
        transferGroup,
        platformStatus: 'SUCCEEDED',
      })
    )
    expect(insert.onConflictDoNothing).toHaveBeenCalledOnce()
    expect(mocks.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `stripe-checkout-${sessionId}`,
        name: 'stripe/checkout.completed',
        data: expect.objectContaining({
          paymentId: 42,
          paymentIntentId,
          sessionId,
          sessionAmount: 5_400,
          sessionCurrency: 'usd',
        }),
      })
    )
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        fulfillmentQueuedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    )
  })

  it('does not queue fulfillment again after an idempotent webhook retry', async () => {
    mockInsertResult([])
    mockSelectResult([createPaymentRecord({ fulfillmentQueuedAt: new Date() })])

    const response = await handleCheckoutSessionWebhook(createCheckoutSession())

    expect(response.status).toBe(200)
    expect(mocks.select).toHaveBeenCalledOnce()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns a retriable failure when durable fulfillment cannot be queued', async () => {
    mockInsertResult([createPaymentRecord()])
    mocks.inngestSend.mockRejectedValue(new Error('Inngest unavailable'))

    const response = await handleCheckoutSessionWebhook(createCheckoutSession())

    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Failed to send event to Inngest')
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
