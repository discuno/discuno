'use client'

import { ConnectNotificationBanner } from '@stripe/react-connect-js'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

// Based on the type definition in StripeOnboardingModal.tsx
export interface StripeStatus {
  hasAccount: boolean
  isActive: boolean
  onboardingCompleted: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  accountId?: string
}

interface StripeNotificationBannerProps {
  stripeStatus: StripeStatus
  onRefetchStripeStatus: () => void
}

export const StripeNotificationBanner = ({
  stripeStatus,
  onRefetchStripeStatus,
}: StripeNotificationBannerProps) => {
  const [message, setMessage] = useState('')

  if (!stripeStatus.hasAccount || stripeStatus.onboardingCompleted) {
    return null
  }

  const handleNotificationsChange = (response: { actionRequired: number; total: number }) => {
    if (response.actionRequired > 0) {
      // Do something related to required actions, such as adding margins to the banner container or tracking the current number of notifications.
      setMessage('You must resolve the notifications on this page before proceeding.')
    } else if (response.total > 0) {
      // Do something related to notifications that don't require action.
      setMessage('The items below are in review.')
    } else {
      setMessage('')
      // If there are no more notifications, refetch Stripe status
      onRefetchStripeStatus()
    }
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{message || 'Action Required: Complete Your Stripe Setup'}</AlertTitle>
      <AlertDescription>
        <div style={message ? { marginBottom: '20px' } : undefined}>
          <ConnectNotificationBanner
            collectionOptions={{
              fields: 'eventually_due',
              futureRequirements: 'include',
            }}
            onNotificationsChange={handleNotificationsChange}
          />
        </div>
      </AlertDescription>
    </Alert>
  )
}
