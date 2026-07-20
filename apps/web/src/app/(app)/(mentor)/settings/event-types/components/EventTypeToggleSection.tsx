'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getMentorEventTypePreferences,
  getMentorStripeStatus,
  refreshMentorEventTypes,
  updateMentorEventTypePreferences,
} from '~/app/(app)/(mentor)/settings/actions'
import { StripeDashboardButton } from '~/app/(app)/(mentor)/settings/components/StripeDashboardButton'
import { EventTypeSettingsContent } from '~/app/(app)/(mentor)/settings/event-types/components/EventTypeSettingsContent'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Item, ItemContent, ItemFooter, ItemGroup, ItemSeparator } from '~/components/ui/item'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'
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

const SessionTypesHeader = ({ actions }: { actions?: ReactNode }) => {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">Session types</h1>
        <p className="text-muted-foreground text-sm leading-6">Choose what students can book.</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
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

  // Keep payout status scoped to this task instead of loading it in every workspace header.
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
    enabled: true,
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
  const payoutsReady =
    stripeStatus?.transfersEnabled === true && stripeStatus.payoutsEnabled === true

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
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" aria-busy="true">
        <SessionTypesHeader />
        <EventTypeToggleSkeleton />
      </div>
    )
  }

  if (eventTypesUnavailable) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <SessionTypesHeader />
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Session types could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{eventTypesData?.error ?? 'Please try again.'}</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => void refetchEventTypes()}
              disabled={eventTypesFetching}
            >
              {eventTypesFetching ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
              )}
              {eventTypesFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <SessionTypesHeader
        actions={
          <>
            {eventTypes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshEventTypesMutation.mutate()}
                disabled={refreshEventTypesMutation.isPending}
              >
                {refreshEventTypesMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                )}
                {refreshEventTypesMutation.isPending ? 'Refreshing…' : 'Refresh'}
              </Button>
            )}
            {stripeStatus?.hasAccount && (!paymentsEnabled || payoutsReady) && (
              <StripeDashboardButton hasStripeAccount payoutsReady={payoutsReady} />
            )}
          </>
        }
      />
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
    </div>
  )
}

const EventTypeToggleSkeleton = () => {
  return (
    <ItemGroup className="border-border gap-0 border-y" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <Fragment key={index}>
          <Item className="px-0 py-5">
            <ItemContent className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
            </ItemContent>
            <ItemFooter className="mt-2 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-20" />
              </div>
            </ItemFooter>
          </Item>
          {index < 2 && <ItemSeparator className="my-0" />}
        </Fragment>
      ))}
    </ItemGroup>
  )
}
