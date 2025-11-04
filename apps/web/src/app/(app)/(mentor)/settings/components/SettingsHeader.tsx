import { connection } from 'next/server'
import { getMentorStripeStatus } from '~/app/(app)/(mentor)/settings/actions'
import { SettingsHeaderClient } from './SettingsHeaderClient'

export const SettingsHeader = async () => {
  await connection()

  // Fetch Stripe status on the server
  const stripeStatus = await getMentorStripeStatus()

  return (
    <SettingsHeaderClient
      hasStripeAccount={stripeStatus.data?.hasAccount ?? false}
      stripeAccountId={stripeStatus.data?.accountId}
      chargesEnabled={stripeStatus.data?.chargesEnabled ?? false}
    />
  )
}
