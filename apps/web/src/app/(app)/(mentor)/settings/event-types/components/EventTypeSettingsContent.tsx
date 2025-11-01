'use client'

import { type StripeConnectInstance } from '@stripe/connect-js/pure'
import type { UseMutationResult } from '@tanstack/react-query'
import { CreditCard, DollarSign, Settings, Timer } from 'lucide-react'
import type { updateMentorEventTypePreferences } from '~/app/(app)/(mentor)/settings/actions'
import { OnboardingInfoBanner } from '~/app/(app)/(mentor)/settings/components/OnboardingInfoBanner'
import { StripeModal } from '~/app/(app)/(mentor)/settings/event-types/components/StripeOnboardingModal'
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
import { Switch } from '~/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

interface EventTypePreference {
  id: number
  title: string
  length: number
  description?: string
  isEnabled: boolean
  customPrice: number | null
  currency: string
}

interface StripeStatus {
  hasAccount: boolean
  onboardingCompleted: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  accountId?: string
}

interface EventTypeSettingsContentProps {
  eventTypes: EventTypePreference[]
  stripeStatus?: StripeStatus
  stripeAccountId: string | null
  connectInstance: StripeConnectInstance | null
  selectedEventType: EventTypePreference | null
  showPricingDialog: boolean
  isStripeModalOpen: boolean
  setStripeModalOpen: (isOpen: boolean) => void
  tempPrice: string
  updateEventTypeMutation: UseMutationResult<
    { success: boolean; error?: string },
    Error,
    {
      eventTypeId: number
      data: Parameters<typeof updateMentorEventTypePreferences>[1]
    },
    unknown
  >
  createStripeAccountMutation: UseMutationResult<unknown, Error, void, unknown>
  onToggleEventType: (eventType: EventTypePreference, checked: boolean) => Promise<void>
  onPricingChange: (eventType: EventTypePreference) => void
  onSavePricing: () => Promise<void>
  onOnboardingComplete: () => void
  setShowPricingDialog: (show: boolean) => void
  setTempPrice: (price: string) => void
}

export const EventTypeSettingsContent = ({
  eventTypes,
  stripeStatus,
  stripeAccountId,
  connectInstance,
  selectedEventType,
  showPricingDialog,
  isStripeModalOpen,
  setStripeModalOpen,
  tempPrice,
  updateEventTypeMutation,
  createStripeAccountMutation,
  onToggleEventType,
  onPricingChange,
  onSavePricing,
  onOnboardingComplete,
  setShowPricingDialog,
  setTempPrice,
}: EventTypeSettingsContentProps) => {
  const isStripeActive = stripeStatus?.chargesEnabled === true
  const hasStripeAccount = stripeStatus?.hasAccount === true
  const needsStripeSetup = !hasStripeAccount || !isStripeActive

  return (
    <div className="space-y-6">
      <OnboardingInfoBanner
        title="Configure Your Session Types"
        description="Choose which types of sessions you want to offer and set your pricing. You can offer free sessions, paid sessions, or a mix of both."
        tips={[
          'Start with free sessions to build reviews and reputation',
          'Stripe is only required if you want to charge for sessions',
          'You can enable multiple session lengths (15, 30, or 60 minutes)',
          'Pricing can be updated anytime',
        ]}
        storageKey="event-types-banner-dismissed"
      />
      {/* Stripe Connection Banner - Only shown when setup needed */}
      {needsStripeSetup && (
        <Alert
          className={
            hasStripeAccount
              ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
              : 'border-primary/50 bg-primary/5 dark:bg-primary/10'
          }
        >
          <CreditCard
            className={
              hasStripeAccount
                ? 'h-4 w-4 text-yellow-600 dark:text-yellow-400'
                : 'text-primary h-4 w-4'
            }
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <AlertDescription>
                {hasStripeAccount ? (
                  <div className="space-y-1">
                    <p className="font-semibold">Complete Your Stripe Setup</p>
                    <p className="text-muted-foreground text-sm">
                      Your Stripe account needs additional verification before you can accept
                      payments. Complete the setup process to enable paid event types.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold">Connect Stripe to Accept Payments</p>
                    <p className="text-muted-foreground text-sm">
                      To offer paid sessions, you need to connect your Stripe account. This allows
                      you to securely receive payments from students who book your time.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </div>
            <div className="flex-shrink-0">
              {hasStripeAccount && connectInstance ? (
                <Dialog open={isStripeModalOpen} onOpenChange={setStripeModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="default">
                      Continue Setup
                    </Button>
                  </DialogTrigger>
                  <StripeModal
                    connectInstance={connectInstance}
                    accountId={stripeAccountId ?? undefined}
                    stripeStatus={stripeStatus}
                    onOnboardingComplete={onOnboardingComplete}
                  />
                </Dialog>
              ) : (
                <Button
                  onClick={() => createStripeAccountMutation.mutate()}
                  disabled={createStripeAccountMutation.isPending}
                  size="sm"
                >
                  {createStripeAccountMutation.isPending ? 'Connecting...' : 'Connect Stripe'}
                </Button>
              )}
            </div>
          </div>
        </Alert>
      )}

      <Card>
        <div className="border-b p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Event Type Settings</h3>
              <p className="text-muted-foreground text-sm">
                Configure which event types are available for booking and set your pricing
              </p>
            </div>

            {/* Stripe Status Badge - Simple indicator */}
            {isStripeActive && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1.5">
                  <CreditCard className="h-3 w-3" />
                  Stripe Connected
                </Badge>
                {connectInstance && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Manage Account
                      </Button>
                    </DialogTrigger>
                    <StripeModal
                      connectInstance={connectInstance}
                      accountId={stripeStatus.accountId}
                      stripeStatus={stripeStatus}
                      onOnboardingComplete={onOnboardingComplete}
                    />
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Event Types List */}
        <CardContent className="p-6">
          <div className="space-y-4">
            {eventTypes.map(eventType => (
              <Card
                key={eventType.id}
                className="hover:border-muted-foreground/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Toggle Switch */}
                    <div className="pt-0.5">
                      {eventType.customPrice && eventType.customPrice > 0 && !isStripeActive ? (
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={eventType.isEnabled}
                                  onCheckedChange={checked => onToggleEventType(eventType, checked)}
                                  disabled={updateEventTypeMutation.isPending}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Complete Stripe setup to enable paid event types</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Switch
                          checked={eventType.isEnabled}
                          onCheckedChange={checked => onToggleEventType(eventType, checked)}
                          disabled={updateEventTypeMutation.isPending}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{eventType.title}</h4>
                          <Badge variant="secondary" className="gap-1">
                            <Timer className="h-3 w-3" />
                            {eventType.length} min
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPricingChange(eventType)}
                          disabled={updateEventTypeMutation.isPending}
                          className="gap-1.5"
                        >
                          <Settings className="h-4 w-4" />
                          Edit Pricing
                        </Button>
                      </div>

                      {eventType.description && (
                        <p className="text-muted-foreground text-sm">{eventType.description}</p>
                      )}

                      <div className="flex items-center gap-1.5">
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">
                          {eventType.customPrice
                            ? `$${(eventType.customPrice / 100).toFixed(2)}`
                            : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  step="1"
                  placeholder="0.00"
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Leave empty or set to 0 for free sessions. Minimum paid price is $5.00.
              </p>
            </div>

            {!isStripeActive &&
              tempPrice &&
              parseFloat(tempPrice) > 0 &&
              parseFloat(tempPrice) >= 5 && (
                <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <AlertDescription className="text-sm">
                    You need to complete Stripe setup and enable this event type to accept bookings
                    for paid sessions.
                  </AlertDescription>
                </Alert>
              )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={onSavePricing}
                disabled={
                  updateEventTypeMutation.isPending ||
                  parseFloat(tempPrice) < 0 ||
                  (parseFloat(tempPrice) > 0 && parseFloat(tempPrice) < 5)
                }
              >
                {updateEventTypeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
