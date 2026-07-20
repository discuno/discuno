import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  markQueued: vi.fn(),
  persist: vi.fn(),
  send: vi.fn(),
}))

vi.mock('~/inngest/client', () => ({ inngest: { send: mocks.send } }))
vi.mock('~/server/dal/webhooks', () => ({
  markStripeWebhookReceiptQueued: mocks.markQueued,
  persistStripeWebhookReceipt: mocks.persist,
}))

import { enqueueVerifiedStripeWebhook } from './webhook-inbox'

describe('Stripe webhook durable receipt queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.persist.mockResolvedValue({ id: 42, processedAt: null, quarantinedAt: null })
    mocks.send.mockResolvedValue({ ids: ['inngest-event'] })
    mocks.markQueued.mockResolvedValue(undefined)
  })

  it('queues only a database receipt ID for platform events', async () => {
    await expect(
      enqueueVerifiedStripeWebhook({
        eventId: 'evt_test_123',
        eventType: 'checkout.session.completed',
        source: 'platform',
      })
    ).resolves.toEqual({ duplicate: false })

    expect(mocks.persist).toHaveBeenCalledWith({
      eventId: 'evt_test_123',
      eventType: 'checkout.session.completed',
      source: 'platform',
      connectedAccountId: null,
    })
    expect(mocks.send).toHaveBeenCalledWith({
      id: 'stripe-platform-webhook-evt_test_123',
      name: 'stripe/webhook.received',
      data: { inboxId: 42 },
    })
    expect(mocks.markQueued).toHaveBeenCalledWith(42)
  })

  it('queues connected account receipts without Stripe payload data', async () => {
    await enqueueVerifiedStripeWebhook({
      eventId: 'evt_connect_123',
      eventType: 'account.updated',
      source: 'connect',
      connectedAccountId: 'acct_123',
    })

    expect(mocks.send).toHaveBeenCalledWith({
      id: 'stripe-connect-webhook-evt_connect_123',
      name: 'stripe/connect-webhook.received',
      data: { inboxId: 42 },
    })
  })

  it('acknowledges an already processed receipt without queueing it again', async () => {
    mocks.persist.mockResolvedValue({ id: 42, processedAt: new Date(), quarantinedAt: null })

    await expect(
      enqueueVerifiedStripeWebhook({
        eventId: 'evt_test_123',
        eventType: 'charge.failed',
        source: 'platform',
      })
    ).resolves.toEqual({ duplicate: true })

    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.markQueued).not.toHaveBeenCalled()
  })

  it('does not mark a receipt queued when event delivery fails', async () => {
    mocks.send.mockRejectedValue(new Error('queue unavailable'))

    await expect(
      enqueueVerifiedStripeWebhook({
        eventId: 'evt_test_123',
        eventType: 'charge.failed',
        source: 'platform',
      })
    ).rejects.toThrow('queue unavailable')

    expect(mocks.markQueued).not.toHaveBeenCalled()
  })
})
