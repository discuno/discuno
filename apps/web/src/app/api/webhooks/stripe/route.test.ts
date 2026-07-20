import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ constructEvent: vi.fn(), enqueue: vi.fn() }))

vi.mock('~/env', () => ({ env: { STRIPE_WEBHOOK_SECRET: 'whsec_test' } }))
vi.mock('~/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
}))
vi.mock('~/lib/stripe/webhook-inbox', () => ({
  enqueueVerifiedStripeWebhook: mocks.enqueue,
}))

import { POST } from '~/app/api/webhooks/stripe/route'

describe('Stripe webhook queue boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructEvent.mockReturnValue({
      id: 'evt_test_123',
      type: 'charge.failed',
      data: { object: {} },
    })
    mocks.enqueue.mockResolvedValue({ duplicate: false })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists and queues only the verified Stripe event receipt before acknowledging', async () => {
    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'signed' },
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.constructEvent).toHaveBeenCalledWith('{}', 'signed', 'whsec_test')
    expect(mocks.enqueue).toHaveBeenCalledWith({
      eventId: 'evt_test_123',
      eventType: 'charge.failed',
      source: 'platform',
    })
  })

  it('rejects an invalid signature without queueing', async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })

    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'signed' },
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('returns a retriable error when the durable queue is unavailable', async () => {
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
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logs).not.toContain(privateError.message)
    expect(logs).not.toContain(privateError.name)
    expect(logs).toContain('Error')
  })

  it('rejects oversized bodies before signature parsing or persistence', async () => {
    const response = await POST(
      new Request('https://discuno.test', {
        method: 'POST',
        body: '{}',
        headers: {
          'content-length': String(1024 * 1024 + 1),
          'stripe-signature': 'signed',
        },
      })
    )

    expect(response.status).toBe(413)
    expect(mocks.constructEvent).not.toHaveBeenCalled()
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })
})
