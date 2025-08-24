'use client'

import { ConnectNotificationBanner } from '@stripe/react-connect-js'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertTitle } from '~/components/ui/alert'

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
  const [actionRequiredCount, setActionRequiredCount] = useState<number | undefined>(undefined)
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)

  if (!stripeStatus.hasAccount || stripeStatus.onboardingCompleted) {
    return null
  }

  const handleNotificationsChange = (response: { actionRequired: number; total: number }) => {
    setActionRequiredCount(response.actionRequired)
    setTotalCount(response.total)

    if (response.actionRequired === 0 && response.total === 0) {
      // If there are no more notifications, refetch Stripe status
      onRefetchStripeStatus()
    }
  }

  const hasActionRequired = Boolean(actionRequiredCount && actionRequiredCount > 0)
  const hasOnlyInReview = !hasActionRequired && Boolean(totalCount && totalCount > 0)

  return (
    <div className="mb-6">
      {hasActionRequired ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            You must resolve the notifications on this page before proceeding.
          </AlertTitle>
        </Alert>
      ) : null}

      {hasOnlyInReview ? (
        <div className="text-muted-foreground mb-4 text-sm">The items below are in review.</div>
      ) : null}

      <ConnectNotificationBanner
        collectionOptions={{
          fields: 'eventually_due',
          futureRequirements: 'include',
        }}
        onNotificationsChange={handleNotificationsChange}
      />
    </div>
  )
}
