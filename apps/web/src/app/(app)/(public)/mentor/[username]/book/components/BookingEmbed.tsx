'use client'

import { TZDate } from '@date-fns/tz'
import { CheckoutProvider } from '@stripe/react-stripe-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type {
  BookingFormInput,
  TimeSlot,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  createBooking as createBookingAction,
  createStripeCheckoutSession,
  fetchEventTypes as fetchEventTypesAction,
  fetchAvailableSlots as fetchSlotsAction,
  type EventType,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { AttendeeDetailsStep } from '~/app/(app)/(public)/mentor/[username]/book/components/AttendeeDetailsStep'
import { BookingCalendar } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/BookingCalendar'
import { BookingConfirmationStep } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingConfirmationStep'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { CheckoutForm } from '~/app/(app)/(public)/mentor/[username]/book/components/CheckoutForm'
import { BadRequestError, ExternalApiError } from '~/lib/errors'
import { stripePromise } from '~/lib/stripe/client'
import { useSession } from '~/lib/auth-client'
import { bookingStateManager } from '~/lib/booking-state-manager'
import { AuthStep } from '~/app/(app)/(public)/mentor/[username]/book/components/AuthStep'

export interface BookingFormData {
  name: string
  email: string
  phone?: string
}

type BookingStep = 'calendar' | 'auth' | 'booking' | 'payment' | 'confirmation'

export const BookingEmbed = ({ bookingData }: { bookingData: BookingData }) => {
  const { resolvedTheme } = useTheme()
  const { calcomUsername } = bookingData
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const today = useMemo(() => new TZDate(new Date(), timeZone), [timeZone])
  const { data: session } = useSession()

  // State management
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
  const [currentMonth, setCurrentMonth] = useState(today)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar')
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
  })
  const [monthlyAvailability, setMonthlyAvailability] = useState<Record<string, TimeSlot[]>>({})

  // Date range for calendar
  const { startMonth, endMonth } = useMemo(
    () => ({
      startMonth: startOfMonth(today),
      endMonth: endOfMonth(addDays(today, 60)),
    }),
    [today]
  )

  // Initialize selected date
  useEffect(() => {
    setSelectedDate(today)
  }, [today])

  // Queries
  const {
    data: eventTypes = [],
    isPending: eventTypesLoading,
    error: eventTypesError,
  } = useQuery({
    queryKey: ['event-types', calcomUsername],
    queryFn: () => fetchEventTypesAction(calcomUsername),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const currentEventId = selectedEventType?.id
  const {
    data: availableSlots,
    isSuccess: isSlotsFetched,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['available-slots', currentEventId, format(currentMonth, 'yyyy-MM')],
    queryFn: () => {
      if (!currentEventId) throw new BadRequestError('No event type selected')
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const startDate = startOfWeek(monthStart)
      const endDate = endOfWeek(monthEnd)

      console.log('Client TimeZone:', timeZone)
      console.log('Fetching slots from (client):', startDate.toISOString())
      console.log('Fetching slots to (client):', endDate.toISOString())

      return fetchSlotsAction(currentEventId, startDate, endDate, timeZone)
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: currentStep === 'calendar' && !!currentEventId,
  })

  // Update monthly availability when slots are fetched
  useEffect(() => {
    if (isSlotsFetched) {
      setMonthlyAvailability(availableSlots)
    }
  }, [isSlotsFetched, availableSlots])

  // Restore booking state after OAuth authentication
  useEffect(() => {
    if (!session || session.user.isAnonymous) return

    const pending = bookingStateManager.getPending()
    if (pending) {
      const { state, stateId } = pending

      // Only restore if we're on the correct mentor's page
      if (state.mentorUsername === bookingData.username) {
        console.log('[BookingEmbed] Restoring booking state after OAuth')

        setSelectedEventType(state.selectedEventType)
        setSelectedTimeSlot(state.selectedTimeSlot)
        setSelectedDate(new Date(state.selectedDate))
        setFormData(state.formData ?? formData)
        setCurrentStep(state.resumeStep)

        // Clear state after restoration
        bookingStateManager.clear(stateId)

        // Show success toast
        toast.success('Signed in successfully!', {
          description: 'Continue with your booking below.',
        })
      }
    }
  }, [session, bookingData.username, formData])

  // Clean up stale booking states on mount
  useEffect(() => {
    bookingStateManager.cleanupStale()
  }, [])

  // Event handlers
  const handleEventTypeSelect = useCallback((eventType: EventType | null) => {
    setSelectedEventType(eventType)
    setSelectedTimeSlot(null)
  }, [])

  const handleTimeSlotSelect = useCallback(
    (timeSlot: string | null) => {
      setSelectedTimeSlot(timeSlot)
      if (timeSlot) {
        // Check if user is anonymous - if so, show auth step
        if (session?.user.isAnonymous) {
          setCurrentStep('auth')
        } else {
          setCurrentStep('booking')
        }
      }
    },
    [session]
  )

  const handlePaymentConfirmed = useCallback(() => {
    toast.success('Payment successful! Your booking will be confirmed via email shortly.')
    setCurrentStep('confirmation')
  }, [])

  const handlePaymentError = useCallback((error: string) => {
    toast.error(error)
  }, [])

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTimeSlot || !selectedEventType || !selectedDate) {
        throw new Error('Missing required booking data')
      }

      const startTime = new TZDate(selectedTimeSlot, timeZone)
      console.log('Booking startTime:', startTime.toISOString())

      // For paid sessions, proceed to the embedded Checkout step
      if ((selectedEventType.price ?? 0) > 0) {
        setCurrentStep('payment')
        return
      }

      // For free bookings, create the booking directly
      await createBookingAction({
        username: calcomUsername,
        eventTypeId: selectedEventType.id,
        startTime: startTime.toISOString(),
        attendee: {
          name: formData.name,
          email: formData.email,
          timeZone,
        },
        mentorUserId: bookingData.userId,
      })
    },
    onSuccess: () => {
      if ((selectedEventType?.price ?? 0) === 0) {
        toast.success('Booking successful! You will receive a confirmation email shortly.')
        setCurrentStep('confirmation')
      }
    },
    onError: error => {
      toast.error(error.message || 'An unexpected error occurred.')
    },
  })

  // Error handling
  if (error) {
    throw new ExternalApiError(error.message)
  }

  // Loading states
  if (eventTypesLoading) {
    return <BookingEmbedSkeleton />
  }

  if (eventTypesError) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Booking Unavailable</h3>
          <p className="text-muted-foreground">
            Failed to load booking calendar. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-full w-full flex-col">
      {currentStep === 'calendar' ? (
        <BookingCalendar
          selectedEventType={selectedEventType}
          eventTypes={eventTypes}
          selectedDate={selectedDate}
          today={today}
          bookingData={bookingData}
          startMonth={startMonth}
          endMonth={endMonth}
          monthlyAvailability={monthlyAvailability}
          isFetchingSlots={isFetching}
          onSelectEventType={handleEventTypeSelect}
          onChangeMonth={month => setCurrentMonth(new TZDate(month, timeZone))}
          onSelectDate={setSelectedDate}
          onSelectTimeSlot={handleTimeSlotSelect}
          timeZone={timeZone}
        />
      ) : currentStep === 'auth' && selectedEventType && selectedTimeSlot && selectedDate ? (
        <AuthStep
          selectedEventType={selectedEventType}
          selectedTimeSlot={selectedTimeSlot}
          selectedDate={selectedDate}
          mentorUsername={bookingData.username}
          formData={formData}
          onBack={() => setCurrentStep('calendar')}
        />
      ) : currentStep === 'booking' ? (
        <AttendeeDetailsStep
          selectedEventType={selectedEventType}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          formData={formData}
          setFormData={setFormData}
          setCurrentStep={setCurrentStep}
          createBookingMutation={createBookingMutation}
        />
      ) : currentStep === 'confirmation' ? (
        <BookingConfirmationStep />
      ) : (
        selectedEventType &&
        selectedDate && (
          <div className="animate-in fade-in slide-in-from-bottom-2 p-6 duration-200">
            <CheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret: async () => {
                  if (!selectedTimeSlot) throw new Error('Missing selected time slot')
                  const startTime = new TZDate(selectedTimeSlot, timeZone)
                  if (isNaN(startTime.getTime())) throw new Error('Invalid time slot')

                  const bookingPayload: BookingFormInput = {
                    eventTypeId: selectedEventType.id,
                    startTimeIso: startTime.toISOString(),
                    attendeeName: formData.name,
                    attendeeEmail: formData.email,
                    attendeePhone: formData.phone,
                    mentorUsername: calcomUsername,
                    mentorUserId: bookingData.userId,
                    price: selectedEventType.price ?? 0,
                    currency: selectedEventType.currency ?? 'USD',
                    timeZone: timeZone,
                  }

                  const response = await createStripeCheckoutSession(bookingPayload)
                  if (!response.clientSecret) {
                    throw new Error('Failed to create checkout session')
                  }
                  return response.clientSecret
                },
                elementsOptions: {
                  appearance: {
                    theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
                  },
                },
              }}
            >
              <CheckoutForm
                eventType={selectedEventType}
                selectedDate={selectedDate}
                selectedTimeSlot={selectedTimeSlot ?? ''}
                formData={formData}
                onBack={() => setCurrentStep('booking')}
                onPaymentConfirmed={handlePaymentConfirmed}
                onPaymentError={handlePaymentError}
                timeZone={timeZone}
              />
            </CheckoutProvider>
          </div>
        )
      )}
    </div>
  )
}
