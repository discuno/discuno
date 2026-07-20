export type StripeAccountStatus = 'pending' | 'active' | 'restricted' | 'inactive'

type StripeAccountState = {
  payouts_enabled: boolean
  details_submitted: boolean
  capabilities?: {
    transfers?: 'active' | 'inactive' | 'pending' | null
  } | null
  requirements?: {
    disabled_reason?: string | null
  } | null
}

export const deriveStripeAccountStatus = (account: StripeAccountState): StripeAccountStatus => {
  if (account.capabilities?.transfers === 'active' && account.payouts_enabled) {
    return 'active'
  }

  if (account.requirements?.disabled_reason?.startsWith('rejected')) {
    return 'inactive'
  }

  return account.details_submitted ? 'restricted' : 'pending'
}
