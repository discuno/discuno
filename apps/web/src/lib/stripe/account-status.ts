export type StripeAccountStatus = 'pending' | 'active' | 'restricted' | 'inactive'

type StripeAccountState = {
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements?: {
    disabled_reason?: string | null
  } | null
}

export const deriveStripeAccountStatus = (account: StripeAccountState): StripeAccountStatus => {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'active'
  }

  if (account.requirements?.disabled_reason?.startsWith('rejected')) {
    return 'inactive'
  }

  return account.details_submitted ? 'restricted' : 'pending'
}
