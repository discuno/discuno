'use client'

import { format } from 'date-fns'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Spinner } from '~/components/ui/spinner'
import { authClient } from '~/lib/auth-client'
import { openAuthWindow } from '~/lib/popup-auth'

interface AuthStepProps {
  selectedEventType: EventType
  selectedTimeSlot: string
  selectedDate: Date
  mentorUsername: string
  formData: BookingFormData
  onBack: () => void
  onSuccess: () => void
}

export const AuthStep = ({
  selectedEventType,
  selectedTimeSlot,
  // selectedDate,
  // mentorUsername,
  // formData,
  onBack,
  onSuccess,
}: AuthStepProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)

      // Use popup callback URL
      const callbackURL = `${window.location.origin}/oauth/success`

      const { data, error } = await authClient.signIn.social({
        provider,
        callbackURL,
        disableRedirect: true,
      })

      if (error) {
        throw new Error(error.message ?? 'Authentication failed')
      }

      if (data.url) {
        // Open popup and wait for success
        await openAuthWindow(data.url)

        // Refresh session to get user data
        await authClient.getSession({
          fetchOptions: {
            onSuccess: () => {
              toast.success('Signed in successfully!')
              onSuccess()
            },
          },
        })
      }
    } catch (error) {
      // Only show error if it wasn't a user cancellation
      if (error instanceof Error && error.message === 'Auth window closed by user') {
        // User closed the window, just reset loading state
        console.log('User cancelled auth')
      } else {
        console.error('OAuth sign in error:', error)
        toast.error('Sign In Failed', {
          description: 'Something went wrong. Please try again.',
        })
      }
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">Sign in to complete your booking</CardTitle>
          <CardDescription className="text-sm">
            Choose a sign-in method to continue with your session booking
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google OAuth Button */}
          <button
            onClick={() => handleOAuthSignIn('google')}
            disabled={!!isLoading}
            className="flex w-full items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {isLoading === 'google' ? (
              <Spinner />
            ) : (
              <Image
                src="/logos/web_light_sq_SI.svg"
                alt="Sign in with Google"
                width={175}
                height={40}
              />
            )}
          </button>

          {/* Microsoft OAuth Button */}
          <button
            onClick={() => handleOAuthSignIn('microsoft')}
            disabled={!!isLoading}
            className="flex w-full items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {isLoading === 'microsoft' ? (
              <Spinner />
            ) : (
              <Image
                src="/logos/ms-symbollockup_signin_light.svg"
                alt="Sign in with Microsoft"
                width={200}
                height={40}
              />
            )}
          </button>

          {/* Booking Summary */}
          <div className="bg-muted mt-6 rounded-lg p-4">
            <h3 className="mb-2 text-sm font-semibold">Your Selected Session</h3>
            <div className="text-muted-foreground space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Session:</span>
                <span className="font-medium">{selectedEventType.title}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-medium">{format(new Date(selectedTimeSlot), 'PPp')}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">{selectedEventType.length} minutes</span>
              </div>
              {selectedEventType.price !== undefined && selectedEventType.price > 0 && (
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">
                    ${(selectedEventType.price / 100).toFixed(2)}{' '}
                    {selectedEventType.currency ?? 'USD'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Back Button */}
          <Button variant="ghost" onClick={onBack} className="w-full" disabled={!!isLoading}>
            Back to Calendar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
