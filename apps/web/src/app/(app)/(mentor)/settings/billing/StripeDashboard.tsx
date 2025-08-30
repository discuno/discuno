'use client'

import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import {
  ConnectAccountManagement,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayouts,
} from '@stripe/react-connect-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createStripeAccountSession } from '~/app/(app)/(mentor)/settings/actions'
import { Skeleton } from '~/components/ui/skeleton'
import { env } from '~/env'
import { darkVariables, lightVariables } from '~/lib/stripe/appearance'

type StripeDashboardProps = {
  accountId: string
}

export function StripeDashboard({ accountId }: StripeDashboardProps) {
  const { theme } = useTheme()
  const appearance = useMemo(() => {
    return {
      overlays: 'dialog' as const,
      variables: theme === 'dark' ? darkVariables : lightVariables,
    }
  }, [theme])

  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null)

  const { data: sessionData } = useQuery({
    queryKey: ['stripe-account-session', accountId],
    queryFn: async () => {
      const result = await createStripeAccountSession({
        accountId,
        notificationBanner: true,
        payouts: true,
        accountManagement: true,
      })
      if (!result.success || !result.client_secret) {
        throw new Error(result.error ?? 'Failed to create Stripe Account Session')
      }
      return result.client_secret
    },
    enabled: !!accountId,
    staleTime: 0,
    retry: 1,
  })

  const initializeConnectMutation = useMutation({
    mutationFn: async (clientSecret: string) => {
      return loadConnectAndInitialize({
        publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
        fetchClientSecret: async () => clientSecret,
        appearance,
      })
    },
    onSuccess: instance => {
      setConnectInstance(instance)
    },
    onError: error => {
      console.error('Failed to initialize Stripe Connect:', error)
      toast.error('Failed to initialize Stripe Connect')
    },
  })

  useEffect(() => {
    if (sessionData && !connectInstance) {
      initializeConnectMutation.mutate(sessionData)
    }
  }, [sessionData, connectInstance, initializeConnectMutation])

  if (initializeConnectMutation.isPending || !connectInstance) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <div className="space-y-4">
        <ConnectNotificationBanner />
        <ConnectPayouts />
        <ConnectAccountManagement />
      </div>
    </ConnectComponentsProvider>
  )
}
