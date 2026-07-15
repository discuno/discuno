import { describe, expect, it } from 'vitest'
import { isDefinitiveStripeCheckoutExpiryError } from '~/lib/stripe/checkout'

describe('Stripe Checkout expiry error classification', () => {
  it('accepts only the exact pre-execution expires_at validation response', () => {
    expect(
      isDefinitiveStripeCheckoutExpiryError({
        type: 'StripeInvalidRequestError',
        param: 'expires_at',
        statusCode: 400,
      })
    ).toBe(true)
  })

  it.each([
    ['network ambiguity', new Error('socket closed')],
    ['provider failure', { type: 'StripeAPIError', param: 'expires_at', statusCode: 500 }],
    [
      'idempotency conflict',
      { type: 'StripeIdempotencyError', param: 'expires_at', statusCode: 400 },
    ],
    [
      'different invalid parameter',
      { type: 'StripeInvalidRequestError', param: 'line_items', statusCode: 400 },
    ],
    [
      'non-400 invalid request',
      { type: 'StripeInvalidRequestError', param: 'expires_at', statusCode: 500 },
    ],
    ['missing error', null],
  ])('rejects %s', (_scenario, error) => {
    expect(isDefinitiveStripeCheckoutExpiryError(error)).toBe(false)
  })
})
