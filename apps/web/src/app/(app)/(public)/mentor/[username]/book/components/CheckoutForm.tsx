import { AddressElement, PaymentElement, useCheckout } from '@stripe/react-stripe-js'
import { format } from 'date-fns'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useState } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface CheckoutFormProps {
  eventType: EventType
  selectedDate: Date
  selectedTimeSlot: string
  formData: BookingFormData
  onBack: () => void
  onPaymentConfirmed: () => void
  onPaymentError: (error: string) => void
}

export const CheckoutForm = ({
  eventType,
  selectedDate,
  selectedTimeSlot,
  formData,
  onBack,
  onPaymentConfirmed,
  onPaymentError,
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
        phoneNumber: formData.phone,
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

  const formattedAmount = ((eventType.price ?? 0) / 100).toFixed(2)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Complete Your Payment
          </CardTitle>
        </div>

        {/* Session Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{eventType.title}</h3>
              <p className="text-muted-foreground text-sm">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTimeSlot}
              </p>
              <p className="text-muted-foreground text-sm">with {formData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">${formattedAmount}</p>
              <div className="text-muted-foreground space-y-1 text-xs" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <PaymentElement />
            <AddressElement
              options={{
                mode: 'billing',
              }}
            />
          </div>

          {message && (
            <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : `Pay $${formattedAmount}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
