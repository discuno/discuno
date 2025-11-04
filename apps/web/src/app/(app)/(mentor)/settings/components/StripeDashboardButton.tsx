'use client'

import { ExternalLink } from 'lucide-react'
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
  stripeAccountId?: string
  chargesEnabled: boolean
}

export const StripeDashboardButton = ({
  hasStripeAccount,
  stripeAccountId,
  chargesEnabled,
}: StripeDashboardButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDashboard = async () => {
    if (!stripeAccountId) return

    setIsLoading(true)
    try {
      const result = await createStripeLoginLink(stripeAccountId)

      if (result.success && result.url) {
        // Open in new tab
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Failed to open Stripe Dashboard', {
          description: result.error ?? 'Please try again later',
        })
      }
    } catch {
      toast.error('Failed to open Stripe Dashboard', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsLoading(true)
    try {
      const result = await createStripeConnectAccount()

      if (result.success && result.accountId) {
        // Create account link and redirect to Stripe-hosted onboarding
        const linkResult = await createStripeAccountLink({
          accountId: result.accountId,
          type: 'account_onboarding',
          collectionOptions: 'eventually_due',
        })

        if (linkResult.success && linkResult.url) {
          toast.success('Redirecting to Stripe setup...')
          // Redirect to Stripe onboarding
          window.location.href = linkResult.url
        } else {
          toast.error('Failed to create onboarding link', {
            description: linkResult.error ?? 'Please try again later',
          })
        }
      } else {
        toast.error('Failed to create Stripe account', {
          description: result.error ?? 'Please try again later',
        })
      }
    } catch {
      toast.error('Failed to create Stripe account', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show "Connect Stripe" if no account OR charges not enabled
  if (!hasStripeAccount || !chargesEnabled) {
    return (
      <Button
        variant="default"
        size="sm"
        disabled={isLoading}
        onClick={handleConnectStripe}
        className="bg-purple-600 text-white hover:bg-purple-700"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        {isLoading ? 'Connecting...' : 'Connect Stripe'}
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      disabled={isLoading}
      onClick={handleOpenDashboard}
      className="bg-purple-600 text-white hover:bg-purple-700"
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      {isLoading ? 'Opening...' : 'Stripe Dashboard'}
    </Button>
  )
}
