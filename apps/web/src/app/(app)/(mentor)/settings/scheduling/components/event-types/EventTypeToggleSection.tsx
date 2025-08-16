'use client'

import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import { ConnectComponentsProvider } from '@stripe/react-connect-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  createStripeAccountSession,
  createStripeConnectAccount,
  getMentorEventTypePreferences,
  getMentorStripeStatus,
  updateMentorEventTypePreferences,
} from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { EventTypeSettingsContent } from '~/app/(app)/(mentor)/settings/scheduling/components/event-types/EventTypeSettingsContent'
import { StripeNotificationBanner } from '~/app/(app)/(mentor)/settings/scheduling/components/event-types/StripeNotificationBanner'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { env } from '~/env'
import { darkVariables, lightVariables } from '~/lib/stripe/appearance'

interface EventTypePreference {
  id: number
  title: string
  length: number
  description?: string
  isEnabled: boolean
  customPrice: number | null
  currency: string
}

export const EventTypeToggleSection = () => {
  const { theme } = useTheme()
  const [selectedEventType, setSelectedEventType] = useState<EventTypePreference | null>(null)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [tempPrice, setTempPrice] = useState<string>('')
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(
    null
  )

  const appearance = useMemo(() => {
    return {
      overlays: 'dialog' as const,
      variables: theme === 'dark' ? darkVariables : lightVariables,
    }
  }, [theme])

  // Fetch mentor's event type preferences
  const {
    data: eventTypesData,
    isLoading: eventTypesLoading,
    error: eventTypesError,
    refetch: refetchEventTypes,
  } = useQuery({
    queryKey: ['mentor-event-types'],
    queryFn: getMentorEventTypePreferences,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch mentor's Stripe status
  const {
    data: stripeStatusData,
    isLoading: stripeStatusLoading,
    refetch: refetchStripeStatus,
  } = useQuery({
    queryKey: ['mentor-stripe-status'],
    queryFn: getMentorStripeStatus,
    staleTime: 5 * 60 * 1000,
  })

  // Update event type preferences
  const updateEventTypeMutation = useMutation({
    mutationFn: updateMentorEventTypePreferences,
    onSuccess: () => {
      toast.success('Event type preferences updated!')
      void refetchEventTypes()
    },
    onError: error => {
      console.error('Failed to update event type preferences:', error)
      toast.error('Failed to update preferences')
    },
  })

  // Create Stripe Connect account
  const createStripeAccountMutation = useMutation({
    mutationFn: createStripeConnectAccount,
    onSuccess: result => {
      if (result.success && result.accountId) {
        setStripeAccountId(result.accountId)
      } else {
        toast.error(result.error ?? 'Failed to create Stripe account')
      }
    },
    onError: error => {
      console.error('Failed to create Stripe account:', error)
      toast.error('Failed to create Stripe account')
    },
  })

  const eventTypes = eventTypesData?.data ?? []
  const stripeStatus = stripeStatusData?.data
  const effectiveAccountId = stripeAccountId ?? stripeStatus?.accountId

  // Fetch account session when effectiveAccountId is available
  const { data: sessionData } = useQuery({
    queryKey: ['stripe-account-session', effectiveAccountId],
    queryFn: () => {
      if (!effectiveAccountId) {
        // Should not happen due to the `enabled` flag, but satisfies TypeScript
        throw new Error('effectiveAccountId is not available')
      }
      return createStripeAccountSession({
        accountId: effectiveAccountId,
        notificationBanner: true,
        accountManagement: true,
        accountOnboarding: true,
      })
    },
    enabled: !!effectiveAccountId,
    staleTime: 0, // Account sessions expire quickly, don't cache
    retry: 1,
  })

  console.log(sessionData)

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
      toast.error('Failed to initialize Stripe Connect')
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

  const handleToggleEventType = async (eventType: EventTypePreference, checked: boolean) => {
    // Use the checked parameter directly instead of toggling based on current state
    await updateEventTypeMutation.mutateAsync({
      calcomEventTypeId: eventType.id,
      isEnabled: checked,
      customPrice: eventType.customPrice ?? undefined,
      currency: eventType.currency,
      title: eventType.title,
      description: eventType.description ?? null,
      duration: eventType.length,
    })
  }

  const handlePricingChange = (eventType: EventTypePreference) => {
    setSelectedEventType(eventType)
    setTempPrice(eventType.customPrice ? (eventType.customPrice / 100).toString() : '')
    setShowPricingDialog(true)
  }

  const handleSavePricing = async () => {
    if (!selectedEventType) return

    const priceInCents = tempPrice ? Math.round(parseFloat(tempPrice) * 100) : null

    // If user is trying to set a price but doesn't have Stripe connected
    if (priceInCents && priceInCents > 0 && !stripeStatus?.isActive) {
      toast.error('Please complete your Stripe setup before setting paid pricing')
      return
    }

    await updateEventTypeMutation.mutateAsync({
      calcomEventTypeId: selectedEventType.id,
      isEnabled: selectedEventType.isEnabled,
      customPrice: priceInCents ?? undefined,
      currency: 'USD',
      title: selectedEventType.title,
      description: selectedEventType.description ?? null,
      duration: selectedEventType.length,
    })

    setShowPricingDialog(false)
    setSelectedEventType(null)
  }

  const handleOnboardingComplete = () => {
    // Refetch Stripe status to check if onboarding was completed
    void refetchStripeStatus()
    toast.success('Stripe setup completed! You can now set pricing for your sessions.')
  }

  if (eventTypesLoading || stripeStatusLoading) {
    return <EventTypeToggleSkeleton />
  }

  if (eventTypesError) {
    return (
      <Alert>
        <AlertDescription>Failed to load event types. Please try again later.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {stripeConnectInstance ? (
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          {stripeStatus && (
            <StripeNotificationBanner
              stripeStatus={stripeStatus}
              onRefetchStripeStatus={refetchStripeStatus}
            />
          )}
          <EventTypeSettingsContent
            eventTypes={eventTypes}
            stripeStatus={stripeStatus}
            stripeAccountId={stripeAccountId}
            connectInstance={stripeConnectInstance}
            selectedEventType={selectedEventType}
            showPricingDialog={showPricingDialog}
            tempPrice={tempPrice}
            updateEventTypeMutation={updateEventTypeMutation}
            createStripeAccountMutation={createStripeAccountMutation}
            onToggleEventType={handleToggleEventType}
            onPricingChange={handlePricingChange}
            onSavePricing={handleSavePricing}
            onOnboardingComplete={handleOnboardingComplete}
            setShowPricingDialog={setShowPricingDialog}
            setTempPrice={setTempPrice}
          />
        </ConnectComponentsProvider>
      ) : (
        <EventTypeSettingsContent
          eventTypes={eventTypes}
          stripeStatus={stripeStatus}
          stripeAccountId={stripeAccountId}
          connectInstance={stripeConnectInstance}
          selectedEventType={selectedEventType}
          showPricingDialog={showPricingDialog}
          tempPrice={tempPrice}
          updateEventTypeMutation={updateEventTypeMutation}
          createStripeAccountMutation={createStripeAccountMutation}
          onToggleEventType={handleToggleEventType}
          onPricingChange={handlePricingChange}
          onSavePricing={handleSavePricing}
          onOnboardingComplete={handleOnboardingComplete}
          setShowPricingDialog={setShowPricingDialog}
          setTempPrice={setTempPrice}
        />
      )}
    </div>
  )
}

const EventTypeToggleSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-80" />
                  <div className="mt-3 flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
