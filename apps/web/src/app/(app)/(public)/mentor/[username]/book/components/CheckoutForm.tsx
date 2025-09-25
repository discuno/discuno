import { TZDate } from '@date-fns/tz'
import { AddressElement, PaymentElement, useCheckout } from '@stripe/react-stripe-js'
import { format } from 'date-fns'
import { ArrowLeft, CreditCard, Receipt } from 'lucide-react'
import { useState } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

interface CheckoutFormProps {
  eventType: EventType
  selectedDate: Date
  selectedTimeSlot: string
  formData: BookingFormData
  onBack: () => void
  onPaymentConfirmed: () => void
  onPaymentError: (error: string) => void
  timeZone: string
}

export const CheckoutForm = ({
  eventType,
  selectedDate,
  selectedTimeSlot,
  formData,
  onBack,
  onPaymentConfirmed,
  onPaymentError,
  timeZone,
}: CheckoutFormProps) => {
  const checkout = useCheckout()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setMessage('')

    try {
      const confirmResult = await checkout.confirm({
        redirect: 'if_required',
      })

      if (confirmResult.type === 'error') {
        setMessage(confirmResult.error.message)
        onPaymentError(confirmResult.error.message)
      } else {
        onPaymentConfirmed()
      }
    } catch (error) {
      console.error('Payment confirmation error:', error)
      const errorMessage = 'An unexpected error occurred. Please try again.'
      setMessage(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  console.log(checkout.total)

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CreditCard className="text-primary h-5 w-5" />
          <h2 className="text-lg font-semibold">Complete Payment</h2>
        </div>
      </div>

      {/* Order Summary */}
      <Card className="border-muted/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Session Info */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium">{eventType.title}</h3>
                <p className="text-muted-foreground text-xs">
                  {format(new TZDate(selectedDate, timeZone), 'MMM d, yyyy')} • {selectedTimeSlot} •{' '}
                  {eventType.length}min
                </p>
                <p className="text-muted-foreground text-xs">with {formData.name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{checkout.total.subtotal.amount}</span>
            </div>

            {checkout.total.taxExclusive.amount && checkout.total.taxExclusive.amount !== '0' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{checkout.total.taxExclusive.amount}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{checkout.total.total.amount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card className="border-muted/40">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-medium">Payment Method</h3>
                <PaymentElement
                  options={{
                    layout: {
                      type: 'accordion',
                      defaultCollapsed: false,
                      radios: false,
                      spacedAccordionItems: true,
                    },
                  }}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">Billing Address</h3>
                <AddressElement
                  options={{
                    mode: 'billing',
                  }}
                />
              </div>
            </div>

            {message && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </div>
              ) : (
                `Pay ${checkout.total.total.amount}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Note */}
      <p className="text-muted-foreground px-4 text-center text-xs">
        Your payment information is secure and encrypted. You&apos;ll receive a confirmation email
        after payment.
      </p>
    </div>
  )
}
