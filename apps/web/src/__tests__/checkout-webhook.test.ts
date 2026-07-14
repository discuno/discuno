import { describe, expect, it } from 'vitest'
import {
  getCheckoutFulfillmentEventId,
  getCheckoutPaymentIntentId,
  isCheckoutSessionReadyForFulfillment,
} from '~/lib/stripe/checkout'

describe('Stripe Checkout fulfillment', () => {
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
