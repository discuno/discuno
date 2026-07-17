import { connection } from 'next/server'
import { getMentorStripeStatus } from '~/app/(app)/(mentor)/settings/actions'
import { env } from '~/env'
import { SettingsHeaderClient } from './SettingsHeaderClient'

export const SettingsHeader = async () => {
  await connection()

  // Fetch Stripe status on the server
  const stripeStatus = await getMentorStripeStatus()
  const stripeData = stripeStatus.success ? stripeStatus.data : undefined

  return (
    <SettingsHeaderClient
      showPayoutAction={stripeData !== undefined && (stripeData.hasAccount || env.PAYMENTS_ENABLED)}
      hasStripeAccount={stripeData?.hasAccount ?? false}
      payoutsReady={
        (stripeData?.transfersEnabled ?? false) && (stripeData?.payoutsEnabled ?? false)
      }
    />
  )
}
