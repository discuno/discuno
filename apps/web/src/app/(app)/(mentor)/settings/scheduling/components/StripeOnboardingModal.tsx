'use client'

import { loadConnectAndInitialize } from '@stripe/connect-js'
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createStripeAccountSession } from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { DialogContent, DialogTitle } from '~/components/ui/dialog'
import { env } from '~/env'

interface StripeModalProps {
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
  accountId,
  stripeStatus,
  onOnboardingComplete,
}: StripeModalProps) => {
  const { theme } = useTheme()
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

  // Memoize appearance config to avoid recreating on every render
  const appearance = useMemo(() => {
    const darkVariables = {
      colorSecondaryText: 'hsl(0, 0%, 85%)',
      colorBackground: 'hsl(252, 8%, 12%)',
      colorText: 'hsl(0, 0%, 99%)',
      colorPrimary: 'hsl(212, 100%, 62%)',
      colorBorder: 'hsl(240, 6%, 23%)',
      borderRadius: '0.75rem',
      buttonSecondaryColorBackground: '#2B3039',
      buttonSecondaryColorText: '#C9CED8',
      actionSecondaryColorText: '#C9CED8',
      actionSecondaryTextDecorationColor: '#C9CED8',
      colorDanger: '#F23154',
      badgeNeutralColorBackground: '#1B1E25',
      badgeNeutralColorBorder: '#2B3039',
      badgeNeutralColorText: '#8C99AD',
      badgeSuccessColorBackground: '#152207',
      badgeSuccessColorBorder: '#20360C',
      badgeSuccessColorText: '#3EAE20',
      badgeWarningColorBackground: '#400A00',
      badgeWarningColorBorder: '#5F1400',
      badgeWarningColorText: '#F27400',
      badgeDangerColorBackground: '#420320',
      badgeDangerColorBorder: '#61092D',
      badgeDangerColorText: '#F46B7D',
      offsetBackgroundColor: '#1B1E25',
      formBackgroundColor: '#14171D',
      overlayBackdropColor: 'rgba(0,0,0,0.5)',
    }

    const lightVariables = {
      colorSecondaryText: 'hsl(224, 10%, 45%)',
      colorBackground: 'hsl(0, 0%, 99%)',
      colorText: 'hsl(224, 14%, 12%)',
      colorPrimary: 'hsl(212, 100%, 50%)',
      colorBorder: 'hsl(240, 6%, 90%)',
      borderRadius: '0.75rem',
    }

    return {
      overlays: 'dialog' as const,
      variables: theme === 'dark' ? darkVariables : lightVariables,
    }
  }, [theme])

  // Determine mode based on Stripe status
  const isManagementMode = stripeStatus?.isActive
  const effectiveAccountId = accountId ?? stripeStatus?.accountId

  // Fetch account session when effectiveAccountId is available
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ['stripe-account-session', effectiveAccountId],
    queryFn: () => createStripeAccountSession(effectiveAccountId as string),
    enabled: !!effectiveAccountId,
    staleTime: 0, // Account sessions expire quickly, don't cache
    retry: 1,
  })

  // Initialize Stripe Connect instance when session data is available
  const initializeConnectMutation = useMutation({
    mutationFn: async (clientSecret: string) => {
      const connectInstance = loadConnectAndInitialize({
        publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
        fetchClientSecret: async () => clientSecret,
        appearance,
      })
      return connectInstance
    },
    onSuccess: connectInstance => {
      setStripeConnectInstance(connectInstance)
    },
    onError: error => {
      console.error('Failed to initialize Stripe Connect:', error)
      toast.error(
        `Failed to initialize Stripe ${isManagementMode ? 'account management' : 'onboarding'}`
      )
    },
  })

  // Initialize Connect when session data becomes available
  useEffect(() => {
    if (sessionData?.success && sessionData.client_secret && !stripeConnectInstance) {
      initializeConnectMutation.mutate(sessionData.client_secret)
    }
  }, [sessionData, stripeConnectInstance, initializeConnectMutation])

  // Reset connect instance when effectiveAccountId changes
  useEffect(() => {
    if (!effectiveAccountId) {
      setStripeConnectInstance(null)
    }
  }, [effectiveAccountId])

  const handleExit = () => {
    console.log(`User exited the ${isManagementMode ? 'management' : 'onboarding'} flow`)
    onOnboardingComplete?.()
  }

  const handleStepChange = (stepChange: { step: string }) => {
    console.log(`User entered step: ${stepChange.step}`)
  }

  // Dynamic content based on mode
  const modalTitle = isManagementMode ? 'Manage Your Stripe Account' : 'Complete Your Stripe Setup'
  const loadingMessage = isManagementMode
    ? 'Loading account management...'
    : 'Loading Stripe onboarding...'

  // Determine loading and error states
  const isLoading = !effectiveAccountId || isSessionLoading || initializeConnectMutation.isPending
  const hasError =
    !!sessionError || !!initializeConnectMutation.error || (sessionData && !sessionData.success)
  const errorMessage =
    sessionError?.message ??
    initializeConnectMutation.error?.message ??
    sessionData?.error ??
    `Failed to initialize ${isManagementMode ? 'account management' : 'onboarding'}`

  return (
    <DialogContent className="max-h-[95vh] max-w-6xl p-0">
      <div className="flex max-h-[95vh] flex-col">
        <DialogTitle className="sr-only">{modalTitle}</DialogTitle>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex h-96 items-center justify-center p-6">
              <LoadingSpinner />
              <span className="ml-2">
                {!effectiveAccountId
                  ? 'Setting up your Stripe account...'
                  : isSessionLoading
                    ? 'Creating account session...'
                    : loadingMessage}
              </span>
            </div>
          )}

          {hasError && (
            <div className="flex h-96 items-center justify-center p-6">
              <div className="text-center">
                <p className="text-destructive mb-4">{errorMessage}</p>
              </div>
            </div>
          )}

          {effectiveAccountId && stripeConnectInstance && !isLoading && !hasError && (
            <div className="p-6">
              <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
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
              </ConnectComponentsProvider>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
