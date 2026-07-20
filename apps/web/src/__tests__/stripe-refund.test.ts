import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createRefund: vi.fn(),
}))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    refunds: { create: mocks.createRefund },
  },
}))

import { refundStripePaymentIntent } from '~/lib/stripe/refund'

describe('Stripe refund creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createRefund.mockResolvedValue({
      id: 're_test_123',
      amount: 5_000,
      status: 'succeeded',
    })
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an idempotent platform-charge refund without destination-charge flags', async () => {
    await expect(
      refundStripePaymentIntent('pi_test_123', { purpose: 'mentor_cancelled' })
    ).resolves.toMatchObject({ success: true, refundId: 're_test_123', status: 'succeeded' })

    expect(mocks.createRefund).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_test_123',
        reason: 'requested_by_customer',
        metadata: { discunoPurpose: 'mentor_cancelled' },
      },
      {
        idempotencyKey: 'discuno:refund:v1:mentor_cancelled:pi_test_123',
      }
    )

    const params = mocks.createRefund.mock.calls[0]?.[0]
    expect(params).not.toHaveProperty('reverse_transfer')
    expect(params).not.toHaveProperty('refund_application_fee')
  })

  it('does not report a failed Stripe refund as successful', async () => {
    mocks.createRefund.mockResolvedValue({ id: 're_test_failed', amount: 5_000, status: 'failed' })
    await expect(refundStripePaymentIntent('pi_test_failed')).resolves.toMatchObject({
      success: false,
      status: 'failed',
    })
  })

  it('does not return or log raw Stripe failures or object identifiers', async () => {
    const privateError = 'Stripe secret for private.user@example.com'
    mocks.createRefund.mockRejectedValue(new Error(privateError))

    const result = await refundStripePaymentIntent('pi_private_identifier')
    const logs = JSON.stringify([
      ...vi.mocked(console.info).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ])

    expect(result).toEqual({ success: false, error: 'Stripe refund request failed' })
    expect(logs).not.toContain(privateError)
    expect(logs).not.toContain('private.user@example.com')
    expect(logs).not.toContain('pi_private_identifier')
    expect(logs).toContain('paymentReference')
    expect(logs).toContain('errorName')
    expect(logs).toContain('Error')
  })
})
