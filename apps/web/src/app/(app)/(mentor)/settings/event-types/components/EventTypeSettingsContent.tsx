'use client'

import type { UseMutationResult } from '@tanstack/react-query'
import { Fragment } from 'react'
import {
  CalendarPlus,
  CircleAlert,
  CirclePause,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Timer,
} from 'lucide-react'
import { type updateMentorEventTypePreferences } from '~/app/(app)/(mentor)/settings/actions'
import { StripeDashboardButton } from '~/app/(app)/(mentor)/settings/components/StripeDashboardButton'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '~/components/ui/item'
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'
import { MAXIMUM_PAID_BOOKING_PRICE, MINIMUM_PAID_BOOKING_PRICE } from '~/lib/constants'
import { cn } from '~/lib/utils'

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

interface StripeStatus {
  hasAccount: boolean
  onboardingCompleted: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  transfersEnabled: boolean
}

interface EventTypeSettingsContentProps {
  eventTypes: EventTypePreference[]
  stripeStatus?: StripeStatus
  stripeStatusUnavailable: boolean
  paymentsEnabled: boolean
  selectedEventType: EventTypePreference | null
  showPricingDialog: boolean
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
  isRefreshing: boolean
  onToggleEventType: (eventType: EventTypePreference, checked: boolean) => Promise<void>
  onPricingChange: (eventType: EventTypePreference) => void
  onSavePricing: () => Promise<void>
  onRefresh: () => void
  onRetryStripeStatus: () => void
  isRetryingStripeStatus: boolean
  setShowPricingDialog: (show: boolean) => void
  setTempPrice: (price: string) => void
}

const minimumPaidPrice = MINIMUM_PAID_BOOKING_PRICE / 100
const maximumPaidPrice = MAXIMUM_PAID_BOOKING_PRICE / 100

export const getSessionPriceError = (value: string): string => {
  if (!value) return ''

  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) return 'Enter 0 or a positive number'
  if (price > 0 && price < minimumPaidPrice) return 'Minimum paid price is $5.00'
  if (price > maximumPaidPrice) return 'Maximum session price is $10,000.00'
  if ((value.split('.')[1]?.length ?? 0) > 2) return 'Use no more than two decimal places'
  return ''
}

export const EventTypeSettingsContent = ({
  eventTypes,
  stripeStatus,
  stripeStatusUnavailable,
  paymentsEnabled,
  selectedEventType,
  showPricingDialog,
  tempPrice,
  updateEventTypeMutation,
  isRefreshing,
  onToggleEventType,
  onPricingChange,
  onSavePricing,
  onRefresh,
  onRetryStripeStatus,
  isRetryingStripeStatus,
  setShowPricingDialog,
  setTempPrice,
}: EventTypeSettingsContentProps) => {
  const isStripeActive =
    stripeStatus?.transfersEnabled === true && stripeStatus.payoutsEnabled === true
  const hasStripeAccount = stripeStatus?.hasAccount === true
  const needsStripeSetup =
    paymentsEnabled && !stripeStatusUnavailable && (!hasStripeAccount || !isStripeActive)
  const priceError = getSessionPriceError(tempPrice)
  const parsedPrice = Number(tempPrice)
  const isPaidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0
  const selectedSessionIsVisible = selectedEventType?.isEnabled === true
  const paidPriceWouldMakeVisibleSessionUnavailable =
    isPaidPrice &&
    selectedSessionIsVisible &&
    (!paymentsEnabled || stripeStatusUnavailable || !isStripeActive)

  const handlePriceChange = (value: string) => {
    setTempPrice(value)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {!paymentsEnabled && (
          <Alert>
            <CirclePause aria-hidden="true" />
            <AlertTitle>Paid sessions are paused</AlertTitle>
            <AlertDescription>
              You can publish free sessions now. Paid sessions will stay unavailable until Discuno
              enables payments as a separate launch step.
            </AlertDescription>
          </Alert>
        )}

        {paymentsEnabled && stripeStatusUnavailable && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Payout status could not be checked</AlertTitle>
            <AlertDescription>
              <p>Paid-session controls stay paused until the status loads successfully.</p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={onRetryStripeStatus}
                disabled={isRetryingStripeStatus}
              >
                {isRetryingStripeStatus ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                )}
                {isRetryingStripeStatus ? 'Checking…' : 'Try again'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {needsStripeSetup && (
          <Alert>
            <CreditCard aria-hidden="true" />
            <AlertTitle>
              {hasStripeAccount ? 'Finish payout setup' : 'Connect payouts to offer paid sessions'}
            </AlertTitle>
            <AlertDescription>
              <p>
                {hasStripeAccount
                  ? 'Complete the remaining payout steps before publishing a paid session.'
                  : 'Set up payouts before publishing a paid session. Free sessions do not require it.'}
              </p>
              <StripeDashboardButton
                hasStripeAccount={hasStripeAccount}
                payoutsReady={isStripeActive}
              />
            </AlertDescription>
          </Alert>
        )}

        {eventTypes.length === 0 ? (
          <Empty className="border-border border-y">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarPlus aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Create the first session students can book</EmptyTitle>
              <EmptyDescription>
                Set its duration and meeting location in Cal.com, then refresh to publish it here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row flex-wrap justify-center gap-2">
              <a
                href="https://app.cal.com/event-types"
                target="_blank"
                rel="noreferrer"
                className={buttonVariants()}
              >
                Create a session type
                <ExternalLink data-icon="inline-end" aria-hidden="true" />
              </a>
              <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
                {isRefreshing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                )}
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ItemGroup className="border-border gap-0 border-y">
            {eventTypes.map((eventType, index) => {
              const isPaid = (eventType.customPrice ?? 0) > 0
              const paymentAvailabilityBlocked =
                isPaid && (!paymentsEnabled || stripeStatusUnavailable || !isStripeActive)
              const currentlyUnavailable =
                !eventType.bookingCompatible || paymentAvailabilityBlocked
              const cannotEnable = !eventType.isEnabled && currentlyUnavailable
              const switchId = `event-type-${eventType.id}-enabled`
              const availabilityDescriptionId = currentlyUnavailable
                ? `event-type-${eventType.id}-availability`
                : undefined
              const visibilityLabel = eventType.isEnabled
                ? currentlyUnavailable
                  ? 'On, but unavailable'
                  : 'Visible to students'
                : 'Hidden from students'

              return (
                <Fragment key={eventType.id}>
                  <Item role="listitem" className="px-0 py-5">
                    <ItemContent className="min-w-0 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle role="heading" aria-level={2} className="text-base">
                          {eventType.title}
                        </ItemTitle>
                        <Badge variant="secondary">
                          <Timer data-icon="inline-start" aria-hidden="true" />
                          {eventType.length} min
                        </Badge>
                        {!eventType.bookingCompatible && (
                          <Badge variant="destructive">Needs scheduling update</Badge>
                        )}
                        {paymentAvailabilityBlocked && (
                          <Badge variant="warning">Paid bookings paused</Badge>
                        )}
                      </div>

                      {eventType.description && (
                        <ItemDescription className="line-clamp-none leading-6">
                          {eventType.description}
                        </ItemDescription>
                      )}

                      {currentlyUnavailable && (
                        <ItemDescription
                          id={availabilityDescriptionId}
                          className={cn(
                            'line-clamp-none leading-6',
                            !eventType.bookingCompatible && 'text-destructive'
                          )}
                        >
                          {!eventType.bookingCompatible
                            ? 'This session uses a scheduling option Discuno cannot book yet. Remove recurrence, manual confirmation, required sign-in or email verification, and custom required questions in Cal.com, then refresh.'
                            : !paymentsEnabled
                              ? 'This paid session is hidden from students while paid bookings are paused. You can turn it off or set it to free.'
                              : stripeStatusUnavailable
                                ? 'This paid session stays unavailable until payout status can be checked again.'
                                : 'Finish payout setup before making this paid session visible to students.'}
                        </ItemDescription>
                      )}
                    </ItemContent>

                    <ItemFooter className="mt-2 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                      <p className="flex items-baseline gap-2 text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-semibold">
                          {eventType.customPrice
                            ? `$${(eventType.customPrice / 100).toFixed(2)}`
                            : 'Free'}
                        </span>
                      </p>

                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <Field
                          orientation="horizontal"
                          data-disabled={cannotEnable || updateEventTypeMutation.isPending}
                          className="w-fit gap-2"
                        >
                          <Switch
                            id={switchId}
                            checked={eventType.isEnabled}
                            onCheckedChange={checked => onToggleEventType(eventType, checked)}
                            disabled={cannotEnable || updateEventTypeMutation.isPending}
                            aria-describedby={availabilityDescriptionId}
                          />
                          <FieldLabel htmlFor={switchId}>{visibilityLabel}</FieldLabel>
                        </Field>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPricingChange(eventType)}
                          disabled={updateEventTypeMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          Set price
                        </Button>
                      </div>
                    </ItemFooter>
                  </Item>
                  {index < eventTypes.length - 1 && <ItemSeparator className="my-0" />}
                </Fragment>
              )
            })}
          </ItemGroup>
        )}
      </div>

      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set price for {selectedEventType?.title}</DialogTitle>
            <DialogDescription>Choose free or enter a session price.</DialogDescription>
          </DialogHeader>

          <form
            method="post"
            className="flex flex-col gap-6"
            onSubmit={event => {
              event.preventDefault()
              if (
                updateEventTypeMutation.isPending ||
                priceError ||
                paidPriceWouldMakeVisibleSessionUnavailable
              ) {
                return
              }
              void onSavePricing()
            }}
          >
            <FieldGroup>
              <Field data-invalid={priceError ? true : undefined}>
                <FieldLabel htmlFor="price">Price (USD)</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput
                    id="price"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={maximumPaidPrice}
                    step="0.01"
                    placeholder="0.00"
                    value={tempPrice}
                    onChange={event => handlePriceChange(event.target.value)}
                    aria-invalid={priceError ? true : undefined}
                    autoFocus
                  />
                </InputGroup>
                <FieldDescription>
                  Leave empty or enter 0 for free. Paid sessions range from $5 to $10,000. Discuno
                  retains 15% and you receive 85%; Discuno covers standard payment processing costs.
                </FieldDescription>
                <FieldError>{priceError}</FieldError>
              </Field>
            </FieldGroup>

            {isPaidPrice && (!paymentsEnabled || stripeStatusUnavailable || !isStripeActive) && (
              <Alert>
                <CirclePause aria-hidden="true" />
                <AlertTitle>
                  {selectedSessionIsVisible
                    ? 'Hide this session before saving'
                    : 'Price will stay private'}
                </AlertTitle>
                <AlertDescription>
                  {selectedSessionIsVisible
                    ? !paymentsEnabled
                      ? 'Paid bookings are paused. Turn this session off first, or keep it free so students can book it now.'
                      : stripeStatusUnavailable
                        ? 'Payout status cannot be checked right now. Turn this session off before changing it to a paid session.'
                        : 'Finish payout setup or turn this session off before changing it to a paid session.'
                    : !paymentsEnabled
                      ? 'You can save the price while this session is hidden. It cannot be made visible until paid bookings launch.'
                      : stripeStatusUnavailable
                        ? 'You can save the price while this session is hidden. Payout status must load before you make it visible.'
                        : 'You can save the price while this session is hidden. Finish payout setup before you make it visible.'}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPricingDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  updateEventTypeMutation.isPending ||
                  !!priceError ||
                  paidPriceWouldMakeVisibleSessionUnavailable
                }
              >
                {updateEventTypeMutation.isPending && <Spinner data-icon="inline-start" />}
                {updateEventTypeMutation.isPending ? 'Saving…' : 'Save price'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
