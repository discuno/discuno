'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  getMentorEventTypePreferences,
  getMentorStripeStatus,
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
}

export const EventTypeToggleSection = () => {
  const searchParams = useSearchParams()
  const [selectedEventType, setSelectedEventType] = useState<EventTypePreference | null>(null)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [tempPrice, setTempPrice] = useState<string>('')

  // Handle Stripe onboarding return
  useEffect(() => {
    const stripeSetup = searchParams.get('stripe_setup')
    const stripeRefresh = searchParams.get('stripe_refresh')

    if (stripeSetup === 'success') {
      toast.success('Stripe setup completed! You can now accept payments.')
      // Clean up URL params
      window.history.replaceState({}, '', '/settings/event-types')
    } else if (stripeRefresh === 'true') {
      toast.error('Stripe setup expired or was invalid. Please try again.')
      // Clean up URL params
      window.history.replaceState({}, '', '/settings/event-types')
    }
  }, [searchParams])

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
  const { data: stripeStatusData, isLoading: stripeStatusLoading } = useQuery({
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

  const eventTypes = eventTypesData?.data ?? []
  const stripeStatus = stripeStatusData?.data

  const handleToggleEventType = async (eventType: EventTypePreference, checked: boolean) => {
    // Prevent enabling paid event types without Stripe
    if (checked && eventType.customPrice && eventType.customPrice > 0) {
      if (!stripeStatus?.chargesEnabled) {
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
      onToggleEventType={handleToggleEventType}
      onPricingChange={handlePricingChange}
      onSavePricing={handleSavePricing}
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
