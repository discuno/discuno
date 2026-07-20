'use client'

import { CreditCard, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  createStripeAccountLink,
  createStripeConnectAccount,
  createStripeLoginLink,
} from '~/app/(app)/(mentor)/settings/actions'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'

interface StripeDashboardButtonProps {
  hasStripeAccount: boolean
  payoutsReady: boolean
}

export const StripeDashboardButton = ({
  hasStripeAccount,
  payoutsReady,
}: StripeDashboardButtonProps) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const redirectToReauthentication = (result: {
    code?: 'SESSION_NOT_FRESH'
    reauthUrl?: string
  }): boolean => {
    if (result.code !== 'SESSION_NOT_FRESH' || !result.reauthUrl) return false
    router.push(result.reauthUrl)
    return true
  }

  const handleOpenDashboard = async () => {
    setIsLoading(true)
    try {
      const result = await createStripeLoginLink()

      if (result.success && result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } else if (redirectToReauthentication(result)) {
        return
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

      if (redirectToReauthentication(result)) {
        return
      }

      if (result.success) {
        const linkResult = await createStripeAccountLink({
          type: 'account_onboarding',
          collectionOptions: 'eventually_due',
        })

        if (linkResult.success && linkResult.url) {
          toast.success('Opening secure payout setup…')
          window.location.href = linkResult.url
        } else if (redirectToReauthentication(linkResult)) {
          return
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

  if (!hasStripeAccount || !payoutsReady) {
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
          <Spinner data-icon="inline-start" />
        ) : (
          <CreditCard data-icon="inline-start" aria-hidden="true" />
        )}
        <span>{isLoading ? 'Opening…' : label}</span>
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
        <Spinner data-icon="inline-start" />
      ) : (
        <ExternalLink data-icon="inline-start" aria-hidden="true" />
      )}
      <span>{isLoading ? 'Opening…' : 'Payout dashboard'}</span>
    </Button>
  )
}
