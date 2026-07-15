'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  getMentorEventTypePreferences,
  getMentorStripeStatus,
  refreshMentorEventTypes,
  updateMentorEventTypePreferences,
} from '~/app/(app)/(mentor)/settings/actions'
import { EventTypeSettingsContent } from '~/app/(app)/(mentor)/settings/event-types/components/EventTypeSettingsContent'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { type UpdateMentorEventType } from '~/lib/schemas/db'

interface EventTypePreference {
  id: number
  title: string
  length: number
  description?: string
  isEnabled: boolean
  customPrice: number | null
  currency: string
  bookingCompatible: boolean
  bookingCompatibilityReasons: string[]
}

export const EventTypeToggleSection = () => {
  const searchParams = useSearchParams()
  const [selectedEventType, setSelectedEventType] = useState<EventTypePreference | null>(null)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [tempPrice, setTempPrice] = useState<string>('')
  const hasHandledStripeReturn = useRef(false)

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

  // A Stripe return URL only proves that the mentor came back. Reconcile the
  // provider account before describing payouts as ready.
  useEffect(() => {
    if (hasHandledStripeReturn.current) return

    const stripeSetup = searchParams.get('stripe_setup')
    const stripeRefresh = searchParams.get('stripe_refresh')
    if (stripeSetup !== 'success' && stripeRefresh !== 'true') return

    hasHandledStripeReturn.current = true

    if (stripeRefresh === 'true') {
      toast.error('Payout setup expired before it was finished. Please try again.')
      window.history.replaceState({}, '', '/settings/event-types')
      return
    }

    const toastId = toast.loading('Checking payout setup…')
    void refetchStripeStatus()
      .then(result => {
        const statusResult = result.data
        const status = statusResult?.data

        if (statusResult?.success && status?.onboardingCompleted) {
          toast.success('Payout setup is ready', {
            id: toastId,
            description: 'You can now offer paid sessions.',
          })
          return
        }

        if (statusResult?.success) {
          toast.info('Payout setup still needs attention', {
            id: toastId,
            description:
              'Stripe has not enabled payouts yet. Use “Finish payout setup” to complete any remaining steps.',
          })
          return
        }

        toast.error("Couldn't confirm payout setup", {
          id: toastId,
          description: statusResult?.error ?? 'Please refresh the page and try again.',
        })
      })
      .catch(() => {
        toast.error("Couldn't confirm payout setup", {
          id: toastId,
          description: 'Please refresh the page and try again.',
        })
      })
      .finally(() => window.history.replaceState({}, '', '/settings/event-types'))
  }, [refetchStripeStatus, searchParams])

  // Update event type preferences
  const updateEventTypeMutation = useMutation({
    mutationFn: ({ eventTypeId, data }: { eventTypeId: number; data: UpdateMentorEventType }) =>
      updateMentorEventTypePreferences(eventTypeId, data),
    onSuccess: result => {
      if (!result.success) {
        toast.error(result.error ?? 'Could not update this session type')
        return
      }
      toast.success('Session type updated')
      void refetchEventTypes()
    },
    onError: () => toast.error('Could not update this session type'),
  })

  const refreshEventTypesMutation = useMutation({
    mutationFn: refreshMentorEventTypes,
    onSuccess: result => {
      if (!result.success) {
        toast.error(result.error ?? 'Could not refresh session types')
        return
      }
      toast.success('Session types refreshed')
      void refetchEventTypes()
    },
    onError: () => toast.error('Could not refresh session types'),
  })

  const eventTypes = eventTypesData?.data ?? []
  const stripeStatus = stripeStatusData?.data

  const handleToggleEventType = async (eventType: EventTypePreference, checked: boolean) => {
    if (checked && !eventType.bookingCompatible) {
      toast.error('Update this session type in Cal.com, then refresh before enabling it')
      return
    }
    // Prevent enabling paid event types without Stripe
    if (checked && eventType.customPrice && eventType.customPrice > 0) {
      if (!stripeStatus?.transfersEnabled || !stripeStatus.payoutsEnabled) {
        toast.error('Complete Stripe setup to enable paid event types')
        return
      }
    }

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
    <EventTypeSettingsContent
      eventTypes={eventTypes}
      stripeStatus={stripeStatus}
      selectedEventType={selectedEventType}
      showPricingDialog={showPricingDialog}
      tempPrice={tempPrice}
      updateEventTypeMutation={updateEventTypeMutation}
      isRefreshing={refreshEventTypesMutation.isPending}
      onToggleEventType={handleToggleEventType}
      onPricingChange={handlePricingChange}
      onSavePricing={handleSavePricing}
      onRefresh={() => refreshEventTypesMutation.mutate()}
      setShowPricingDialog={setShowPricingDialog}
      setTempPrice={setTempPrice}
    />
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
