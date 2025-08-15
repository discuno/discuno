'use client'

import { loadConnectAndInitialize } from '@stripe/connect-js'
import { ConnectComponentsProvider } from '@stripe/react-connect-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CreditCard, DollarSign, Settings, Timer } from 'lucide-react'
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
import { StripeNotificationBanner } from '~/app/(app)/(mentor)/settings/scheduling/components/StripeNotificationBanner'
import { StripeModal } from '~/app/(app)/(mentor)/settings/scheduling/components/StripeOnboardingModal'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { env } from '~/env'

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
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

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

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Event Type Settings</h3>
          <p className="text-muted-foreground text-sm">
            Configure which event types are available for booking and set your pricing
          </p>
        </div>

        {/* Stripe Status */}
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {stripeStatus?.hasAccount && stripeStatus.isActive ? (
            <div className="flex items-center gap-2">
              <Badge variant="default">Stripe Connected</Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Manage Account
                  </Button>
                </DialogTrigger>
                <StripeModal
                  accountId={stripeStatus.accountId}
                  stripeStatus={stripeStatus}
                  onOnboardingComplete={handleOnboardingComplete}
                />
              </Dialog>
            </div>
          ) : stripeStatus?.hasAccount ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Stripe Pending</Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => createStripeAccountMutation.mutate()}
                    disabled={createStripeAccountMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {createStripeAccountMutation.isPending ? 'Loading...' : 'Continue Setup'}
                  </Button>
                </DialogTrigger>
                <StripeModal
                  accountId={stripeAccountId ?? undefined}
                  stripeStatus={stripeStatus}
                  onOnboardingComplete={handleOnboardingComplete}
                />
              </Dialog>
            </div>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  onClick={() => createStripeAccountMutation.mutate()}
                  disabled={createStripeAccountMutation.isPending}
                  size="sm"
                >
                  {createStripeAccountMutation.isPending ? 'Connecting...' : 'Connect Stripe'}
                </Button>
              </DialogTrigger>
              <StripeModal
                accountId={stripeAccountId ?? undefined}
                stripeStatus={stripeStatus}
                onOnboardingComplete={handleOnboardingComplete}
              />
            </Dialog>
          )}
        </div>
      </div>

      {/* Event Types List */}
      <div className="grid gap-4">
        {eventTypes.map(eventType => (
          <Card key={eventType.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{eventType.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Timer className="mr-1 h-3 w-3" />
                        {eventType.length} min
                      </Badge>
                    </div>
                    <Switch
                      checked={eventType.isEnabled}
                      onCheckedChange={checked => handleToggleEventType(eventType, checked)}
                      disabled={updateEventTypeMutation.isPending}
                    />
                  </div>

                  {eventType.description && (
                    <p className="text-muted-foreground mt-2 text-sm">{eventType.description}</p>
                  )}

                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {eventType.customPrice
                          ? `$${(eventType.customPrice / 100).toFixed(2)} USD`
                          : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePricingChange(eventType)}
                    disabled={updateEventTypeMutation.isPending}
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    Pricing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Pricing - {selectedEventType?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <div className="relative">
                <DollarSign className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  className="pl-9"
                  disabled={!stripeStatus?.isActive}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {stripeStatus?.isActive
                  ? 'Leave empty for free sessions'
                  : 'Complete Stripe setup to enable paid pricing'}
              </p>
            </div>

            {!stripeStatus?.isActive && (
              <Alert>
                <AlertDescription>
                  You need to complete your Stripe setup before setting paid pricing.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePricing}
                disabled={updateEventTypeMutation.isPending || !stripeStatus?.isActive}
              >
                {updateEventTypeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

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
          {content}
        </ConnectComponentsProvider>
      ) : (
        content
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
