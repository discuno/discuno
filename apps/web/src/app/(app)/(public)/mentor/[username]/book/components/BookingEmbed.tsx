'use client'

import { TZDate } from '@date-fns/tz'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BookingSidebar } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingSidebar'

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
import { AuthStep } from '~/app/(app)/(public)/mentor/[username]/book/components/AuthStep'
import { BookingCalendar } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/BookingCalendar'
import { BookingConfirmationStep } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingConfirmationStep'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'

import { useSession } from '~/lib/auth-client'
import { BadRequestError, ExternalApiError } from '~/lib/errors'

export interface BookingFormData {
  name: string
  email: string
  phone?: string
}

type BookingStep = 'calendar' | 'auth' | 'booking' | 'confirmation'

export const BookingEmbed = ({
  bookingData,
  isFullPage = false,
}: {
  bookingData: BookingData
  isFullPage?: boolean
}) => {
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

  // Auto-select first event type to skip selection step
  useEffect(() => {
    const firstEvent = eventTypes[0]
    if (eventTypes.length > 0 && !selectedEventType && firstEvent) {
      setSelectedEventType(firstEvent)
    }
  }, [eventTypes, selectedEventType])

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

  // Auto-advance to booking step when authenticated
  useEffect(() => {
    if (currentStep === 'auth' && session && !session.user.isAnonymous) {
      console.log('[BookingEmbed] User authenticated, advancing to booking step')
      setCurrentStep('booking')
    }
  }, [currentStep, session])

  // Prefill form with user's name and email when logged in
  useEffect(() => {
    if (!session || session.user.isAnonymous) return

    setFormData(prev => ({
      ...prev,
      name: prev.name || session.user.name || '',
      email: prev.email || session.user.email || '',
    }))
  }, [session])

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
        toast.loading('Redirecting to secure checkout...')

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

        if (response.url) {
          window.location.href = response.url
          return
        }

        throw new Error('Failed to initiate secure checkout')
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
          onSuccess={() => {
            console.log('[BookingEmbed] AuthStep reported success')
            setCurrentStep('booking')
          }}
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
        <BookingConfirmationStep />
      )}
    </div>
  )

  if (isFullPage) {
    // Import dynamically or assume it's available (since I can't strict mode imports in this tool easily without top-level)
    // Actually I need to add import at top. I'll rely on the previous content helper to be just a function.
    // I can't easily add top-level imports with replace_file_content if I only replace specific specific section.
    // I'm replacing lines 43-end, so the top level imports (1-42) are untouched.
    // I need to add BookingSidebar import.
    // I'll do a MultiReplace to add import and change body.
    return (
      <div className="flex h-[800px] w-full flex-col overflow-hidden rounded-2xl border shadow-xl lg:flex-row">
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
