'use client'

import { CheckoutProvider } from '@stripe/react-stripe-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type {
  BookingFormInput,
  TimeSlot,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  createStripeCheckoutSession,
  fetchEventTypes as fetchEventTypesAction,
  fetchAvailableSlots as fetchSlotsAction,
  type EventType,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { AttendeeDetailsStep } from '~/app/(app)/(public)/mentor/[username]/book/components/AttendeeDetailsStep'
import { BookingCalendar } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingCalendar'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { CheckoutForm } from '~/app/(app)/(public)/mentor/[username]/book/components/CheckoutForm'
import { BadRequestError, ExternalApiError } from '~/lib/errors'
import { stripePromise } from '~/lib/stripe/client'

export interface BookingFormData {
  name: string
  email: string
  phone?: string
}

type BookingStep = 'calendar' | 'booking' | 'payment'

export const BookingEmbed = ({ bookingData }: { bookingData: BookingData }) => {
  const { calcomUsername } = bookingData
  const today = useMemo(() => new Date(), [])
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])

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

  // Event handlers
  const handleEventTypeSelect = useCallback((eventType: EventType | null) => {
    setSelectedEventType(eventType)
    setSelectedTimeSlot(null)
  }, [])

  const handleTimeSlotSelect = useCallback((timeSlot: string | null) => {
    setSelectedTimeSlot(timeSlot)
    if (timeSlot) {
      setCurrentStep('booking')
    }
  }, [])

  const handlePaymentConfirmed = useCallback(() => {
    toast.success('Payment successful! Your booking will be confirmed via email shortly.')

    // Reset form
    setCurrentStep('calendar')
    setSelectedEventType(null)
    setSelectedTimeSlot(null)
    setFormData({ name: '', email: '', phone: '' })
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

      const [hours, minutes] = selectedTimeSlot.split(':')
      const startTime = new Date(selectedDate)
      startTime.setHours(parseInt(hours ?? '0'), parseInt(minutes ?? '0'), 0, 0)

      // For paid sessions, proceed to the embedded Checkout step
      if ((selectedEventType.price ?? 0) > 0) {
        setCurrentStep('payment')
        return
      }

      // TODO: Implement free booking flow (direct Cal.com booking without Stripe)
      throw new Error('Free bookings are not supported yet')
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
          onChangeMonth={setCurrentMonth}
          onSelectDate={setSelectedDate}
          onSelectTimeSlot={handleTimeSlotSelect}
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
      ) : (
        selectedEventType &&
        selectedDate && (
          <div className="animate-in fade-in slide-in-from-bottom-2 p-6 duration-200">
            <CheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret: async () => {
                  if (!selectedTimeSlot) throw new Error('Missing selected time slot')
                  const startTime = parse(selectedTimeSlot, 'h:mm a', selectedDate)
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
                  if (!response.success || !response.clientSecret) {
                    throw new Error(response.error ?? 'Failed to create checkout session')
                  }
                  return response.clientSecret
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
              />
            </CheckoutProvider>
          </div>
        )
      )}
    </div>
  )
}
