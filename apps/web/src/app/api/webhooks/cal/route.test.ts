import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const WEBHOOK_SECRET = 'cal_webhook_test_secret'
const ROUTED_WEBHOOK_SECRET = 'cal_routed_webhook_test_secret'
const ROUTE_KEY = 'r'.repeat(43)
const MENTOR_USER_ID = '11111111-1111-4111-8111-111111111111'
const CALCOM_USER_ID = 31415
const mocks = vi.hoisted(() => {
  const env: {
    CALCOM_WEBHOOK_SECRET?: string
    CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS: boolean
  } = {
    CALCOM_WEBHOOK_SECRET: 'cal_webhook_test_secret',
    CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS: true,
  }

  return {
    decryptCalcomToken: vi.fn(),
    env,
    hashCalcomWebhookRouteKey: vi.fn(),
    inngestSend: vi.fn(),
    insert: vi.fn(),
    insertValues: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
    select: vi.fn(),
    selectFrom: vi.fn(),
    selectLimit: vi.fn(),
    selectWhere: vi.fn(),
    update: vi.fn(),
    updateSet: vi.fn(),
    updateWhere: vi.fn(),
  }
})

vi.mock('~/env', () => ({
  env: mocks.env,
}))
vi.mock('~/inngest/client', () => ({ inngest: { send: mocks.inngestSend } }))
vi.mock('~/lib/calcom', () => ({ getCalcomBooking: vi.fn() }))
vi.mock('~/lib/calcom/token-crypto', () => ({
  decryptCalcomToken: mocks.decryptCalcomToken,
}))
vi.mock('~/lib/calcom/webhooks', () => ({
  hashCalcomWebhookRouteKey: mocks.hashCalcomWebhookRouteKey,
}))
vi.mock('~/lib/posthog-server', () => ({ trackServerEvent: vi.fn() }))
vi.mock('~/lib/services/booking-service', () => ({
  cancelLocalBooking: vi.fn(),
  completeLocalBooking: vi.fn(),
  createLocalBooking: vi.fn(),
  getLocalBookingLifecycleContext: vi.fn(),
  recordLocalBookingLifecycle: vi.fn(),
  setLocalBookingMentorPayoutEligibility: vi.fn(),
  updateLocalBookingStatus: vi.fn(),
}))
vi.mock('~/lib/services/calcom-tokens-service', () => ({
  getUserIdByCalcomUserId: vi.fn(),
}))
vi.mock('~/lib/services/payment-service', () => ({
  holdBookingPaymentForManualReview: vi.fn(),
  refundBookingPayment: vi.fn(),
  scheduleBookingMentorPayout: vi.fn(),
  scheduleMentorPayout: vi.fn(),
  updatePaymentPayoutEligibility: vi.fn(),
}))
vi.mock('~/server/dal/analytics', () => ({ createAnalyticsEvent: vi.fn() }))
vi.mock('~/server/db', () => ({
  db: { insert: mocks.insert, select: mocks.select, update: mocks.update },
}))

import { POST } from '~/app/api/webhooks/cal/route'

const createRequest = (
  body: string,
  signature?: string,
  url = 'https://discuno.test/api/webhooks/cal'
) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'x-cal-signature-256':
        signature ?? crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex'),
    },
    body,
  })

const createRoutedRequest = (
  body: string,
  signingSecret = ROUTED_WEBHOOK_SECRET,
  routeKey = ROUTE_KEY
) =>
  createRequest(
    body,
    crypto.createHmac('sha256', signingSecret).update(body).digest('hex'),
    `https://discuno.test/api/webhooks/cal?connection=${routeKey}`
  )

const routedConnection = {
  userId: MENTOR_USER_ID,
  calcomUserId: CALCOM_USER_ID,
  webhookSecret: 'encrypted-routed-secret',
}

const createTenantClaimedBody = ({
  mentorUserId = MENTOR_USER_ID,
  calcomUserId = CALCOM_USER_ID,
}: {
  mentorUserId?: string
  calcomUserId?: number
} = {}) =>
  JSON.stringify({
    triggerEvent: 'RECORDING_READY',
    createdAt: '2026-07-14T12:00:00.000Z',
    payload: {
      organizer: { id: calcomUserId },
      metadata: { mentorUserId },
    },
  })

describe('Cal.com webhook inbox boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.CALCOM_WEBHOOK_SECRET = WEBHOOK_SECRET
    mocks.env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS = true
    mocks.decryptCalcomToken.mockReturnValue(ROUTED_WEBHOOK_SECRET)
    mocks.hashCalcomWebhookRouteKey.mockReturnValue('hashed-route-key')
    mocks.returning.mockResolvedValue([{ id: 42, processedAt: null }])
    mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning })
    mocks.insertValues.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing })
    mocks.insert.mockReturnValue({ values: mocks.insertValues })
    mocks.selectLimit.mockResolvedValue([])
    mocks.selectWhere.mockReturnValue({ limit: mocks.selectLimit })
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere })
    mocks.select.mockReturnValue({ from: mocks.selectFrom })
    mocks.updateWhere.mockResolvedValue(undefined)
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere })
    mocks.update.mockReturnValue({ set: mocks.updateSet })
    mocks.inngestSend.mockResolvedValue({ ids: ['event-42'] })
  })

  it('persists the signed payload but queues only its inbox ID', async () => {
    const body = JSON.stringify({
      triggerEvent: 'RECORDING_READY',
      createdAt: '2026-07-14T12:00:00.000Z',
      payload: { attendeeEmail: 'private.student@example.com' },
    })

    const response = await POST(createRequest(body))

    expect(response.status).toBe(200)
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        triggerEvent: 'RECORDING_READY',
        payload: JSON.parse(body),
      })
    )
    expect(mocks.inngestSend).toHaveBeenCalledWith({
      id: 'calcom-webhook-42',
      name: 'calcom/webhook.received',
      data: { inboxId: 42 },
    })
    expect(JSON.stringify(mocks.inngestSend.mock.calls)).not.toContain(
      'private.student@example.com'
    )
  })

  it('accepts a tenant-bound route signed with that connection secret', async () => {
    const body = createTenantClaimedBody()
    mocks.selectLimit.mockResolvedValueOnce([routedConnection])

    const response = await POST(createRoutedRequest(body))

    expect(response.status).toBe(200)
    expect(mocks.hashCalcomWebhookRouteKey).toHaveBeenCalledWith(ROUTE_KEY)
    expect(mocks.decryptCalcomToken).toHaveBeenCalledWith(
      routedConnection.webhookSecret,
      MENTOR_USER_ID
    )
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionUserId: MENTOR_USER_ID,
        calcomUserId: CALCOM_USER_ID,
      })
    )
  })

  it('rejects an unknown tenant route before persisting its payload', async () => {
    const body = createTenantClaimedBody()
    mocks.selectLimit.mockResolvedValueOnce([])

    const response = await POST(createRoutedRequest(body))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook route' })
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('rejects a routed payload signed with another connection secret', async () => {
    const body = createTenantClaimedBody()
    mocks.selectLimit.mockResolvedValueOnce([routedConnection])

    const response = await POST(createRoutedRequest(body, 'wrong-connection-secret'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid signature' })
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it.each([
    {
      label: 'organizer',
      claims: { calcomUserId: CALCOM_USER_ID + 1 },
    },
    {
      label: 'mentor metadata',
      claims: { mentorUserId: '22222222-2222-4222-8222-222222222222' },
    },
  ])('rejects $label claims that cross the route-bound tenant', async ({ claims }) => {
    const body = createTenantClaimedBody(claims)
    mocks.selectLimit.mockResolvedValueOnce([routedConnection])

    const response = await POST(createRoutedRequest(body))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Webhook connection mismatch' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('retires the no-route legacy webhook when shared-secret fallback is disabled', async () => {
    mocks.env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS = false
    const body = JSON.stringify({ triggerEvent: 'RECORDING_READY', payload: {} })

    const response = await POST(createRequest(body))

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({ error: 'Legacy webhook route retired' })
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('fails closed if skipped environment validation enables legacy routing without a secret', async () => {
    mocks.env.CALCOM_WEBHOOK_SECRET = undefined
    const body = JSON.stringify({ triggerEvent: 'RECORDING_READY', payload: {} })

    const response = await POST(createRequest(body))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Webhook verification unavailable' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('rejects an invalid signature before touching the inbox', async () => {
    const body = JSON.stringify({ triggerEvent: 'RECORDING_READY', payload: {} })

    const response = await POST(createRequest(body, 'invalid'))

    expect(response.status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('rejects an oversized payload before reading or persisting it', async () => {
    const response = await POST(
      new Request('https://discuno.test/api/webhooks/cal', {
        method: 'POST',
        headers: {
          'x-cal-signature-256': 'unused',
        },
        body: 'x'.repeat(1024 * 1024 + 1),
      })
    )

    expect(response.status).toBe(413)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('acknowledges an already-processed duplicate without requeueing it', async () => {
    const body = JSON.stringify({ triggerEvent: 'RECORDING_READY', payload: {} })
    mocks.returning.mockResolvedValue([])
    mocks.selectLimit.mockResolvedValue([{ id: 42, processedAt: new Date() }])

    const response = await POST(createRequest(body))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
    expect(mocks.inngestSend).not.toHaveBeenCalled()
  })

  it('returns a retriable failure when the queue does not accept the persisted event', async () => {
    const body = JSON.stringify({ triggerEvent: 'RECORDING_READY', payload: {} })
    mocks.inngestSend.mockRejectedValue(new Error('queue unavailable'))

    const response = await POST(createRequest(body))

    expect(response.status).toBe(500)
  })
})
