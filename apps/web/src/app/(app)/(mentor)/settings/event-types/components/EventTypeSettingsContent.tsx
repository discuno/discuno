'use client'

import { type StripeConnectInstance } from '@stripe/connect-js/pure'
import type { UseMutationResult } from '@tanstack/react-query'
import { CreditCard, DollarSign, Settings, Timer } from 'lucide-react'
import type { updateMentorEventTypePreferences } from '~/app/(app)/(mentor)/settings/actions'
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
    <>
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AlertDescription>
                {hasStripeAccount ? (
                  <div className="space-y-2">
                    <p className="font-semibold">Complete Your Stripe Setup</p>
                    <p className="text-muted-foreground text-sm">
                      Your Stripe account needs additional verification before you can accept
                      payments. Complete the setup process to enable paid event types.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold">Connect Stripe to Accept Payments</p>
                    <p className="text-muted-foreground text-sm">
                      To offer paid sessions, you need to connect your Stripe account. This allows
                      you to securely receive payments from students who book your time.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </div>
            <div className="ml-4">
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

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Event Type Settings</h3>
          <p className="text-muted-foreground text-sm">
            Configure which event types are available for booking and set your pricing
          </p>
        </div>

        {/* Stripe Status Badge - Simple indicator */}
        {isStripeActive && (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <Badge variant="default">Stripe Connected</Badge>
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
                      onCheckedChange={checked => onToggleEventType(eventType, checked)}
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
                    onClick={() => onPricingChange(eventType)}
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
                  min="5"
                  step="1"
                  placeholder="5.00"
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  className="pl-9"
                  disabled={!isStripeActive}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {isStripeActive
                  ? 'Leave empty for free sessions. Minimum price is $5.00.'
                  : 'Complete Stripe setup to enable paid pricing'}
              </p>
            </div>

            {!isStripeActive && (
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
                onClick={onSavePricing}
                disabled={
                  updateEventTypeMutation.isPending ||
                  !isStripeActive ||
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
    </>
  )
}
