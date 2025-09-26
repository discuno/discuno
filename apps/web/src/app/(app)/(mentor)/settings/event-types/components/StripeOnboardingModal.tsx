'use client'

import type { StripeConnectInstance } from '@stripe/connect-js/pure'
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { DialogContent, DialogTitle } from '~/components/ui/dialog'

interface StripeModalProps {
  connectInstance: StripeConnectInstance
  accountId?: string
  stripeStatus?: {
    hasAccount: boolean
    isActive: boolean
    onboardingCompleted: boolean
    payoutsEnabled: boolean
    chargesEnabled: boolean
    accountId?: string
  }
  onOnboardingComplete?: () => void
}

export const StripeModal = ({
  connectInstance,
  accountId,
  stripeStatus,
  onOnboardingComplete,
}: StripeModalProps) => {
  // Determine mode based on Stripe status
  const isManagementMode = stripeStatus?.isActive
  const effectiveAccountId = accountId ?? stripeStatus?.accountId

  const handleExit = () => {
    console.log(`User exited the ${isManagementMode ? 'management' : 'onboarding'} flow`)
    onOnboardingComplete?.()
  }

  const handleStepChange = (stepChange: { step: string }) => {
    console.log(`User entered step: ${stepChange.step}`)
  }

  // Dynamic content based on mode
  const modalTitle = isManagementMode ? 'Manage Your Stripe Account' : 'Complete Your Stripe Setup'

  return (
    <DialogContent className="max-h-[95vh] max-w-6xl p-0">
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <div className="flex max-h-[95vh] flex-col">
          <DialogTitle className="sr-only">{modalTitle}</DialogTitle>

          <div className="flex-1 overflow-y-auto">
            {!effectiveAccountId && (
              <div className="flex h-96 items-center justify-center p-6">
                <LoadingSpinner />
                <span className="ml-2">Setting up your Stripe account...</span>
              </div>
            )}

            {effectiveAccountId && (
              <div className="p-6">
                {isManagementMode ? (
                  <ConnectAccountManagement
                    collectionOptions={{
                      fields: 'eventually_due',
                      futureRequirements: 'include',
                    }}
                  />
                ) : (
                  <ConnectAccountOnboarding
                    onExit={handleExit}
                    onStepChange={handleStepChange}
                    collectionOptions={{
                      fields: 'eventually_due',
                      futureRequirements: 'include',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </ConnectComponentsProvider>
    </DialogContent>
  )
}
