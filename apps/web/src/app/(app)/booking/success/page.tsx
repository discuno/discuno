'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { handlePaymentIntentComplete } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default function BookingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [isProcessing, setIsProcessing] = useState(true)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setIsProcessing(false)
        return
      }

      try {
        const result = await handlePaymentIntentComplete(sessionId)

        if (result.success) {
          setBookingId(result.bookingId ?? null)
        } else {
          setError(result.error ?? 'Failed to process payment')
        }
      } catch (error) {
        console.error('Error processing payment:', error)
        setError('An unexpected error occurred')
      } finally {
        setIsProcessing(false)
      }
    }

    void processPayment()
  }, [sessionId])

  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-4 h-8 w-8 animate-spin" />
            <h2 className="mb-2 text-lg font-semibold">Processing your booking...</h2>
            <p className="text-muted-foreground text-center text-sm">
              Please wait while we confirm your payment and create your booking.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Booking Failed</CardTitle>
            <CardDescription>There was an issue processing your booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
                Go Home
              </Button>
              <Button onClick={() => router.back()} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <CardTitle className="text-green-700">Booking Confirmed!</CardTitle>
              <CardDescription>Your mentoring session has been booked successfully</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="font-semibold text-green-900">What happens next?</h3>
            <ul className="mt-2 space-y-1 text-sm text-green-800">
              <li>• You&apos;ll receive a confirmation email with meeting details</li>
              <li>• A calendar invite will be sent to you</li>
              <li>• Your mentor will reach out if needed</li>
            </ul>
          </div>

          {bookingId && (
            <div className="text-muted-foreground text-sm">
              <p>Booking ID: #{bookingId}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
              Back to Home
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="flex-1">
              View Bookings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
