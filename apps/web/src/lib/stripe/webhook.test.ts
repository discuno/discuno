import type { Stripe } from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStripeAccountByStripeId: vi.fn(),
  getStripeAccountByUserId: vi.fn(),
  markStripeAccountDeleted: vi.fn(),
  releaseCheckoutSlotReservationFromMetadata: vi.fn(),
  retrieveAccount: vi.fn(),
  upsertStripeAccount: vi.fn(),
}))

vi.mock('~/app/(app)/(public)/mentor/[username]/book/actions', () => ({
  handleCheckoutSessionWebhook: vi.fn(),
}))
vi.mock('~/lib/services/payment-service', () => ({
  syncStripeDispute: vi.fn(),
  syncStripePaymentFailure: vi.fn(),
  syncStripeRefund: vi.fn(),
}))
vi.mock('~/lib/services/checkout-slot-reservation', () => ({
  releaseCheckoutSlotReservationFromMetadata: mocks.releaseCheckoutSlotReservationFromMetadata,
}))
vi.mock('~/lib/stripe/index', () => ({
  stripe: {
    accounts: { retrieve: mocks.retrieveAccount },
    disputes: { retrieve: vi.fn() },
    refunds: { retrieve: vi.fn() },
  },
}))
vi.mock('~/server/dal/stripe', () => ({
  getStripeAccountByStripeId: mocks.getStripeAccountByStripeId,
  getStripeAccountByUserId: mocks.getStripeAccountByUserId,
  markStripeAccountDeleted: mocks.markStripeAccountDeleted,
  upsertStripeAccount: mocks.upsertStripeAccount,
}))

import { processStripeConnectWebhookEvent, processStripeWebhookEvent } from '~/lib/stripe/webhook'

const asStripeEventFixture = (event: unknown): Stripe.Event => event as Stripe.Event

describe('Stripe Checkout reservation cleanup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('releases the Cal.com hold when hosted Checkout expires', async () => {
    const metadata = {
      bookingAttemptId: '33333333-3333-4333-8333-333333333333',
      calcomReservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
      mentorUserId: '22222222-2222-4222-8222-222222222222',
    }

    await processStripeWebhookEvent(
      asStripeEventFixture({
        type: 'checkout.session.expired',
        data: { object: { metadata } },
      })
    )

    expect(mocks.releaseCheckoutSlotReservationFromMetadata).toHaveBeenCalledWith(metadata)
  })
})

describe('Stripe Connect account reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.markStripeAccountDeleted.mockResolvedValue({ userId: 'mentor-user-id' })
  })

  it('disables the locally stored account when Stripe reports that account deleted', async () => {
    mocks.retrieveAccount.mockResolvedValue({
      id: 'acct_stored_123',
      object: 'account',
      deleted: true,
    })
    const event = asStripeEventFixture({
      type: 'account.updated',
      data: { object: { id: 'acct_stored_123' } },
    })

    await processStripeConnectWebhookEvent(event)

    expect(mocks.retrieveAccount).toHaveBeenCalledWith('acct_stored_123')
    expect(mocks.markStripeAccountDeleted).toHaveBeenCalledWith('acct_stored_123')
    expect(mocks.getStripeAccountByUserId).not.toHaveBeenCalled()
    expect(mocks.getStripeAccountByStripeId).not.toHaveBeenCalled()
    expect(mocks.upsertStripeAccount).not.toHaveBeenCalled()
  })

  it('disables the stored account when authoritative retrieval confirms it is missing', async () => {
    mocks.retrieveAccount.mockRejectedValue({ code: 'resource_missing' })
    const event = asStripeEventFixture({
      type: 'account.updated',
      data: { object: { id: 'acct_stored_123' } },
    })

    await processStripeConnectWebhookEvent(event)

    expect(mocks.markStripeAccountDeleted).toHaveBeenCalledWith('acct_stored_123')
    expect(mocks.upsertStripeAccount).not.toHaveBeenCalled()
  })
})
