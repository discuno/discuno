'use client'

import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  createStripeAccountLink,
  createStripeConnectAccount,
  createStripeLoginLink,
} from '~/app/(app)/(mentor)/settings/actions'
import { Button } from '~/components/ui/button'

interface StripeDashboardButtonProps {
  hasStripeAccount: boolean
  chargesEnabled: boolean
}

export const StripeDashboardButton = ({
  hasStripeAccount,
  chargesEnabled,
}: StripeDashboardButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDashboard = async () => {
    setIsLoading(true)
    try {
      const result = await createStripeLoginLink()

      if (result.success && result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error("Couldn't open the payout dashboard", {
          description: result.error ?? 'Please try again later',
        })
      }
    } catch {
      toast.error("Couldn't open the payout dashboard", {
        description: 'Please try again later',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsLoading(true)
    try {
      const result = await createStripeConnectAccount()

      if (result.success) {
        const linkResult = await createStripeAccountLink({
          type: 'account_onboarding',
          collectionOptions: 'eventually_due',
        })

        if (linkResult.success && linkResult.url) {
          toast.success('Opening secure payout setup…')
          window.location.href = linkResult.url
        } else {
          toast.error("Couldn't open payout setup", {
            description: linkResult.error ?? 'Please try again later',
          })
        }
      } else {
        toast.error("Couldn't start payout setup", {
          description: result.error ?? 'Please try again later',
        })
      }
    } catch {
      toast.error("Couldn't start payout setup", {
        description: 'Please try again later',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasStripeAccount || !chargesEnabled) {
    const label = hasStripeAccount ? 'Finish payout setup' : 'Set up payouts'

    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={handleConnectStripe}
        aria-label={isLoading ? 'Opening payout setup' : label}
      >
        {isLoading ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isLoading ? 'Opening…' : label}</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isLoading}
      onClick={handleOpenDashboard}
      aria-label={isLoading ? 'Opening payout dashboard' : 'Open payout dashboard'}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <ExternalLink aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{isLoading ? 'Opening…' : 'Payout dashboard'}</span>
    </Button>
  )
}
