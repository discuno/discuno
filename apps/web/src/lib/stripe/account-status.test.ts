import { describe, expect, it } from 'vitest'
import { deriveStripeAccountStatus } from './account-status'

describe('deriveStripeAccountStatus', () => {
  it.each([
    ['active', true, true, null, 'active'],
    ['pending', false, false, null, 'pending'],
    ['inactive', false, true, 'requirements.past_due', 'restricted'],
    ['inactive', false, false, 'rejected.fraud', 'inactive'],
  ] as const)(
    'maps provider state to %s/%s/%s/%s as %s',
    (transfersCapability, payoutsEnabled, detailsSubmitted, disabledReason, expected) => {
      expect(
        deriveStripeAccountStatus({
          payouts_enabled: payoutsEnabled,
          details_submitted: detailsSubmitted,
          capabilities: { transfers: transfersCapability },
          requirements: { disabled_reason: disabledReason },
        })
      ).toBe(expected)
    }
  )

  it('prioritizes enabled capabilities over stale requirements', () => {
    expect(
      deriveStripeAccountStatus({
        payouts_enabled: true,
        details_submitted: true,
        capabilities: { transfers: 'active' },
        requirements: { disabled_reason: 'rejected.other' },
      })
    ).toBe('active')
  })
})
