import { describe, expect, it } from 'vitest'
import { deriveStripeAccountStatus } from './account-status'

describe('deriveStripeAccountStatus', () => {
  it.each([
    [true, true, true, null, 'active'],
    [false, false, false, null, 'pending'],
    [false, false, true, 'requirements.past_due', 'restricted'],
    [false, false, false, 'rejected.fraud', 'inactive'],
  ] as const)(
    'maps provider state to %s/%s/%s/%s as %s',
    (chargesEnabled, payoutsEnabled, detailsSubmitted, disabledReason, expected) => {
      expect(
        deriveStripeAccountStatus({
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          details_submitted: detailsSubmitted,
          requirements: { disabled_reason: disabledReason },
        })
      ).toBe(expected)
    }
  )

  it('prioritizes enabled capabilities over stale requirements', () => {
    expect(
      deriveStripeAccountStatus({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: { disabled_reason: 'rejected.other' },
      })
    ).toBe('active')
  })
})
