'use client'

import { TZDate } from '@date-fns/tz'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BookingSidebar } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingSidebar'

import type { BookingFormInput } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  createBooking as createBookingAction,
  createStripeCheckoutSession,
  fetchAvailableSlots as fetchSlotsAction,
  type EventType,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { AttendeeDetailsStep } from '~/app/(app)/(public)/mentor/[username]/book/components/AttendeeDetailsStep'
import { BookingCalendar } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/BookingCalendar'
import { BookingConfirmationStep } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingConfirmationStep'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'

import { useSession } from '~/lib/auth-client'
import { MINIMUM_PAID_BOOKING_LEAD_MINUTES } from '~/lib/constants'
import { BadRequestError, ExternalApiError } from '~/lib/errors'

export interface BookingFormData {
  name: string
  email: string
  phone: string
  topic: string
}

type BookingStep = 'calendar' | 'booking' | 'confirmation'

export const BookingEmbed = ({
  bookingData,
  isFullPage = false,
}: {
  bookingData: BookingData
  isFullPage?: boolean
}) => {
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const today = useMemo(() => new TZDate(new Date(), timeZone), [timeZone])
  const { data: session } = useSession()

  // State management
  const [selectedEventTypeOverride, setSelectedEventTypeOverride] = useState<EventType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [currentMonth, setCurrentMonth] = useState(today)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [bookingAttemptId, setBookingAttemptId] = useState(() => crypto.randomUUID())
  const [paidAttemptSubmitted, setPaidAttemptSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar')
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    topic: '',
  })

  // Date range for calendar
  const { startMonth, endMonth } = useMemo(
    () => ({
      startMonth: startOfMonth(today),
      endMonth: endOfMonth(addDays(today, 60)),
    }),
    [today]
  )

  // Queries
  const { eventTypes } = bookingData

  // Default to the first event type while preserving an explicit user selection.
  const selectedEventType = selectedEventTypeOverride ?? eventTypes[0] ?? null
  const displayedFormData = useMemo<BookingFormData>(
    () => ({
      ...formData,
      name: formData.name || (session && !session.user.isAnonymous ? session.user.name : ''),
      email: formData.email || (session && !session.user.isAnonymous ? session.user.email : ''),
    }),
    [formData, session]
  )

  const currentEventId = selectedEventType?.id
  const {
    data: monthlyAvailability = {},
    dataUpdatedAt,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['available-slots', currentEventId, format(currentMonth, 'yyyy-MM')],
    queryFn: () => {
      if (!currentEventId) throw new BadRequestError('No event type selected')
      const startDate = startOfMonth(currentMonth)
      const endDate = endOfMonth(currentMonth)

      console.log('Client TimeZone:', timeZone)
      console.log('Fetching slots from (client):', startDate.toISOString())
      console.log('Fetching slots to (client):', endDate.toISOString())

      return fetchSlotsAction(currentEventId, startDate, endDate, timeZone)
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: currentStep === 'calendar' && !!currentEventId,
  })

  const displayedAvailability = useMemo(() => {
    if ((selectedEventType?.price ?? 0) <= 0) return monthlyAvailability
    const earliestPaidStart = dataUpdatedAt + MINIMUM_PAID_BOOKING_LEAD_MINUTES * 60 * 1000
    return Object.fromEntries(
      Object.entries(monthlyAvailability).map(([date, slots]) => [
        date,
        slots.filter(slot => Date.parse(slot.time) >= earliestPaidStart),
      ])
    )
  }, [dataUpdatedAt, monthlyAvailability, selectedEventType?.price])

  // Event handlers
  const handleEventTypeSelect = useCallback((eventType: EventType | null) => {
    setSelectedEventTypeOverride(eventType)
    setSelectedDate(undefined)
    setSelectedTimeSlot(null)
    setBookingAttemptId(crypto.randomUUID())
    setPaidAttemptSubmitted(false)
  }, [])

  const handleTimeSlotSelect = useCallback((timeSlot: string | null) => {
    setSelectedTimeSlot(timeSlot)
    if (timeSlot) {
      setBookingAttemptId(crypto.randomUUID())
      setPaidAttemptSubmitted(false)
      setCurrentStep('booking')
    }
  }, [])

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTimeSlot || !selectedEventType || !selectedDate) {
        throw new Error('Missing required booking data')
      }

      const startTime = new TZDate(selectedTimeSlot, timeZone)
      console.log('Booking startTime:', startTime.toISOString())

      // For paid sessions, redirect to Stripe Hosted Checkout
      if ((selectedEventType.price ?? 0) > 0) {
        // An ambiguous Stripe response must replay this attempt's exact server
        // snapshot. Freeze recipient details until the student selects a new
        // time (and therefore a new attempt ID) instead of implying edits took.
        setPaidAttemptSubmitted(true)
        const bookingPayload: BookingFormInput = {
          eventTypeId: selectedEventType.id,
          startTimeIso: startTime.toISOString(),
          attendeeName: displayedFormData.name,
          attendeeEmail: displayedFormData.email,
          attendeePhone: displayedFormData.phone,
          attendeeTopic: displayedFormData.topic,
          mentorUsername: bookingData.username,
          timeZone: timeZone,
          bookingAttemptId,
        }

        const response = await createStripeCheckoutSession(bookingPayload)

        if (response.url) {
          window.location.href = response.url
          return
        }

        throw new Error('Failed to initiate secure checkout')
      }

      // For free bookings, create the booking directly
      await createBookingAction({
        username: bookingData.username,
        eventTypeId: selectedEventType.id,
        startTime: startTime.toISOString(),
        bookingAttemptId,
        attendee: {
          name: displayedFormData.name,
          email: displayedFormData.email,
          phone: displayedFormData.phone,
          topic: displayedFormData.topic,
          timeZone,
        },
      })
    },
    onSuccess: () => {
      if ((selectedEventType?.price ?? 0) === 0) {
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

  const renderContent = () => (
    <div className="bg-background flex min-h-full w-full flex-col">
      {currentStep === 'calendar' ? (
        <BookingCalendar
          selectedEventType={selectedEventType}
          eventTypes={eventTypes}
          selectedDate={selectedDate}
          today={today}
          bookingData={bookingData}
          startMonth={startMonth}
          endMonth={endMonth}
          monthlyAvailability={displayedAvailability}
          isFetchingSlots={isFetching}
          onSelectEventType={handleEventTypeSelect}
          onChangeMonth={month => setCurrentMonth(new TZDate(month, timeZone))}
          onSelectDate={setSelectedDate}
          onSelectTimeSlot={handleTimeSlotSelect}
          timeZone={timeZone}
        />
      ) : currentStep === 'booking' ? (
        <AttendeeDetailsStep
          selectedEventType={selectedEventType}
          selectedTimeSlot={selectedTimeSlot}
          timeZone={timeZone}
          formData={displayedFormData}
          setFormData={setFormData}
          setCurrentStep={setCurrentStep}
          createBookingMutation={createBookingMutation}
          detailsLocked={paidAttemptSubmitted}
        />
      ) : (
        <BookingConfirmationStep />
      )}
    </div>
  )

  if (isFullPage) {
    return (
      <div className="bg-card flex h-[800px] w-full flex-col overflow-hidden rounded-2xl border shadow-sm lg:flex-row">
        <div className="bg-muted/30 hidden w-full shrink-0 border-r lg:block lg:w-[320px] xl:w-[380px]">
          <BookingSidebar
            bookingData={bookingData}
            selectedEventType={selectedEventType}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            currentStep={currentStep}
            timeZone={timeZone}
          />
        </div>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
    )
  }

  return renderContent()
}
