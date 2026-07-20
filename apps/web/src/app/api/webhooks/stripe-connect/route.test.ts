import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ constructEvent: vi.fn(), enqueue: vi.fn() }))

vi.mock('~/env', () => ({
  env: {
    STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect_test',
    STRIPE_SECRET_KEY: 'sk_test_discuno',
  },
}))
vi.mock('~/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
}))
vi.mock('~/lib/stripe/webhook-inbox', () => ({
  enqueueVerifiedStripeWebhook: mocks.enqueue,
}))

import { POST } from '~/app/api/webhooks/stripe-connect/route'

describe('Stripe Connect webhook queue boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructEvent.mockReturnValue({
      id: 'evt_connect_123',
      account: 'acct_123',
      type: 'account.updated',
      livemode: false,
      data: { object: {} },
    })
    mocks.enqueue.mockResolvedValue({ duplicate: false })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('acknowledges but does not queue an opposite-mode event', async () => {
    mocks.constructEvent.mockReturnValue({
      id: 'evt_connect_live',
      account: 'acct_live',
      type: 'account.updated',
      livemode: true,
      data: { object: {} },
    })

    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'signed' },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, ignored: true })
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists and queues the event and opaque connected-account IDs', async () => {
    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'signed' },
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.enqueue).toHaveBeenCalledWith({
      eventId: 'evt_connect_123',
      eventType: 'account.updated',
      source: 'connect',
      connectedAccountId: 'acct_123',
    })
  })

  it('redacts raw queue errors while returning a generic retriable response', async () => {
    const privateError = new Error('queue key for private.user@example.com')
    privateError.name = 'private.user@example.com'
    mocks.enqueue.mockRejectedValue(privateError)

    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'signed' },
      })
    )

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.toBe('Webhook queue unavailable')
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logs).not.toContain(privateError.message)
    expect(logs).not.toContain(privateError.name)
    expect(logs).toContain('Error')
  })
})
