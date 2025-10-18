'use client'

import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js/pure'
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
} from '~/app/(app)/(mentor)/settings/actions'
import { EventTypeSettingsContent } from '~/app/(app)/(mentor)/settings/event-types/components/EventTypeSettingsContent'
import { StripeNotificationBanner } from '~/app/(app)/(mentor)/settings/event-types/components/StripeNotificationBanner'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { env } from '~/env'
import { type UpdateMentorEventType } from '~/lib/schemas/db'
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
  const [isStripeModalOpen, setStripeModalOpen] = useState(false)
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
    mutationFn: ({ eventTypeId, data }: { eventTypeId: number; data: UpdateMentorEventType }) =>
      updateMentorEventTypePreferences(eventTypeId, data),
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
        setStripeModalOpen(true)
        void refetchStripeStatus()
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

  // Initialize Stripe Connect instance when session data is available
  const initializeConnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const connectInstance = loadConnectAndInitialize({
        publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
        fetchClientSecret: async () => {
          const session = await createStripeAccountSession({
            accountId,
            notificationBanner: true,
            accountManagement: true,
            accountOnboarding: true,
          })
          if (!session.success || !session.client_secret) {
            throw new Error('Failed to create Stripe Account Session')
          }
          return session.client_secret
        },
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
    if (effectiveAccountId && !stripeConnectInstance) {
      initializeConnectMutation.mutate(effectiveAccountId)
    }
  }, [effectiveAccountId, stripeConnectInstance, initializeConnectMutation])

  // Reset connect instance when effectiveAccountId changes
  useEffect(() => {
    if (!effectiveAccountId) {
      setStripeConnectInstance(null)
    }
  }, [effectiveAccountId])

  const handleToggleEventType = async (eventType: EventTypePreference, checked: boolean) => {
    await updateEventTypeMutation.mutateAsync({
      eventTypeId: eventType.id,
      data: {
        isEnabled: checked,
      },
    })
  }

  const handlePricingChange = (eventType: EventTypePreference) => {
    setSelectedEventType(eventType)
    setTempPrice(eventType.customPrice ? (eventType.customPrice / 100).toString() : '')
    setShowPricingDialog(true)
  }

  const handleSavePricing = async () => {
    if (!selectedEventType) return

    const priceInCents = tempPrice ? Math.round(parseFloat(tempPrice) * 100) : 0

    // If user is trying to set a price but doesn't have Stripe connected
    if (priceInCents && priceInCents > 0 && !stripeStatus?.chargesEnabled) {
      toast.error('Please complete your Stripe setup before setting paid pricing')
      return
    }

    await updateEventTypeMutation.mutateAsync({
      eventTypeId: selectedEventType.id,
      data: {
        customPrice: priceInCents,
        currency: 'USD',
      },
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
            isStripeModalOpen={isStripeModalOpen}
            setStripeModalOpen={setStripeModalOpen}
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
          isStripeModalOpen={isStripeModalOpen}
          setStripeModalOpen={setStripeModalOpen}
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
      <Card>
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-80" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
