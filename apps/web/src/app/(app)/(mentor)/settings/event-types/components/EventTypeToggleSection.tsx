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
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
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

export const EventTypeToggleSection = ({ paymentsEnabled }: { paymentsEnabled: boolean }) => {
  const searchParams = useSearchParams()
  const [selectedEventType, setSelectedEventType] = useState<EventTypePreference | null>(null)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [tempPrice, setTempPrice] = useState<string>('')
  const hasHandledStripeReturn = useRef(false)
  const hasStripeReturn =
    searchParams.get('stripe_setup') === 'success' || searchParams.get('stripe_refresh') === 'true'

  // Fetch mentor's event type preferences
  const {
    data: eventTypesData,
    isLoading: eventTypesLoading,
    isFetching: eventTypesFetching,
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
    isFetching: stripeStatusFetching,
    error: stripeStatusError,
    refetch: refetchStripeStatus,
  } = useQuery({
    queryKey: ['mentor-stripe-status'],
    queryFn: getMentorStripeStatus,
    staleTime: 5 * 60 * 1000,
    enabled: paymentsEnabled || hasStripeReturn,
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
            description: paymentsEnabled
              ? 'You can now offer paid sessions.'
              : 'Your account is ready. Paid sessions remain paused until launch.',
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
  }, [paymentsEnabled, refetchStripeStatus, searchParams])

  // Update event type preferences
  const updateEventTypeMutation = useMutation({
    mutationFn: ({ eventTypeId, data }: { eventTypeId: number; data: UpdateMentorEventType }) =>
      updateMentorEventTypePreferences(eventTypeId, data),
    onSuccess: (result, variables) => {
      if (!result.success) {
        toast.error(result.error ?? 'Could not update this session type')
        return
      }
      toast.success(
        variables.data.customPrice !== undefined
          ? 'Price saved'
          : variables.data.isEnabled
            ? 'Session type enabled'
            : 'Session type hidden'
      )
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
  const eventTypesUnavailable =
    Boolean(eventTypesError) || eventTypesData?.success !== true || !eventTypesData.data
  const stripeStatusUnavailable =
    (paymentsEnabled || hasStripeReturn) &&
    (Boolean(stripeStatusError) || stripeStatusData?.success !== true || !stripeStatusData.data)

  const handleToggleEventType = async (eventType: EventTypePreference, checked: boolean) => {
    if (checked && !eventType.bookingCompatible) {
      toast.error('Update this session type in Cal.com, then refresh before enabling it')
      return
    }
    // Prevent enabling paid event types without Stripe
    if (checked && eventType.customPrice && eventType.customPrice > 0) {
      if (!paymentsEnabled) {
        toast.info(
          'Paid sessions are not available yet. Set this session to free before publishing it.'
        )
        return
      }
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

    const result = await updateEventTypeMutation.mutateAsync({
      eventTypeId: selectedEventType.id,
      data: {
        customPrice: priceInCents,
        currency: 'USD',
      },
    })

    if (result.success) {
      setShowPricingDialog(false)
      setSelectedEventType(null)
    }
  }

  const handlePricingDialogOpenChange = (open: boolean) => {
    setShowPricingDialog(open)
    if (!open) {
      setSelectedEventType(null)
      setTempPrice('')
    }
  }

  if (eventTypesLoading || ((paymentsEnabled || hasStripeReturn) && stripeStatusLoading)) {
    return <EventTypeToggleSkeleton />
  }

  if (eventTypesUnavailable) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <p>{eventTypesData?.error ?? 'Session types could not be loaded. Please try again.'}</p>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => void refetchEventTypes()}
            disabled={eventTypesFetching}
          >
            {eventTypesFetching ? 'Trying again…' : 'Try again'}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <EventTypeSettingsContent
      eventTypes={eventTypes}
      stripeStatus={stripeStatus}
      stripeStatusUnavailable={stripeStatusUnavailable}
      paymentsEnabled={paymentsEnabled}
      selectedEventType={selectedEventType}
      showPricingDialog={showPricingDialog}
      tempPrice={tempPrice}
      updateEventTypeMutation={updateEventTypeMutation}
      isRefreshing={refreshEventTypesMutation.isPending}
      onToggleEventType={handleToggleEventType}
      onPricingChange={handlePricingChange}
      onSavePricing={handleSavePricing}
      onRefresh={() => refreshEventTypesMutation.mutate()}
      onRetryStripeStatus={() => void refetchStripeStatus()}
      isRetryingStripeStatus={stripeStatusFetching}
      setShowPricingDialog={handlePricingDialogOpenChange}
      setTempPrice={setTempPrice}
    />
  )
}

const EventTypeToggleSkeleton = () => {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-80" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-full sm:w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
