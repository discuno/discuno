'use client'

import { TZDate } from '@date-fns/tz'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/types'

import { useSession } from '~/lib/auth-client'
import { MINIMUM_PAID_BOOKING_LEAD_MINUTES } from '~/lib/constants'
import { BadRequestError } from '~/lib/errors'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { useDecisionQuestion } from '~/hooks/use-decision-question'

export interface BookingFormData {
  name: string
  email: string
  phone: string
  topic: string
}

type BookingStep = 'calendar' | 'booking' | 'confirmation'

const subscribeToBrowserEnvironment = () => () => undefined
const getBrowserReady = () => true
const getServerReady = () => false
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const getServerTimeZone = () => 'UTC'

export const BookingEmbed = ({
  bookingData,
  initialNowIso,
  initialEventTypeId,
}: {
  bookingData: BookingData
  initialNowIso?: string
  initialEventTypeId?: number
}) => {
  // Hydrate with the same UTC snapshot the server rendered, then switch to the
  // browser's zone. Reading Intl directly during render makes the server's UTC
  // text disagree with the student's local zone during hydration.
  const timeZone = useSyncExternalStore(
    subscribeToBrowserEnvironment,
    getBrowserTimeZone,
    getServerTimeZone
  )
  const isBrowserReady = useSyncExternalStore(
    subscribeToBrowserEnvironment,
    getBrowserReady,
    getServerReady
  )
  const today = useMemo(
    () => new TZDate(initialNowIso ? new Date(initialNowIso) : new Date(), timeZone),
    [initialNowIso, timeZone]
  )
  const { data: session } = useSession()
  const { question: storedDecisionQuestion, saveQuestion } = useDecisionQuestion()

  // State management
  const [selectedEventTypeOverride, setSelectedEventTypeOverride] = useState<EventType | null>(
    () => bookingData.eventTypes.find(eventType => eventType.id === initialEventTypeId) ?? null
  )
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [currentMonthOverride, setCurrentMonthOverride] = useState<Date | undefined>()
  const currentMonth = currentMonthOverride ?? today
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [bookingAttemptId, setBookingAttemptId] = useState(() => crypto.randomUUID())
  const [paidAttemptSubmitted, setPaidAttemptSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar')
  const [detailsStage, setDetailsStage] = useState<'details' | 'review'>('details')
  const [browserNowMs, setBrowserNowMs] = useState(() =>
    initialNowIso ? Date.parse(initialNowIso) : 0
  )
  const bookingSurfaceRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    topic: storedDecisionQuestion,
  })
  const previousStepRef = useRef<BookingStep>(currentStep)

  useEffect(() => {
    saveQuestion(formData.topic)
  }, [formData.topic, saveQuestion])

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
    refetch,
  } = useQuery({
    queryKey: ['available-slots', currentEventId, format(currentMonth, 'yyyy-MM'), timeZone],
    queryFn: () => {
      if (!currentEventId) throw new BadRequestError('No event type selected')
      const startDate = startOfMonth(currentMonth)
      const endDate = endOfMonth(currentMonth)

      return fetchSlotsAction(currentEventId, startDate, endDate, timeZone)
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: isBrowserReady && currentStep === 'calendar' && !!currentEventId,
  })

  const displayedAvailability = useMemo(() => {
    if ((selectedEventType?.price ?? 0) <= 0) return monthlyAvailability
    const earliestPaidStart =
      Math.max(browserNowMs, dataUpdatedAt) + MINIMUM_PAID_BOOKING_LEAD_MINUTES * 60 * 1000
    return Object.fromEntries(
      Object.entries(monthlyAvailability).map(([date, slots]) => [
        date,
        slots.filter(slot => Date.parse(slot.time) >= earliestPaidStart),
      ])
    )
  }, [browserNowMs, dataUpdatedAt, monthlyAvailability, selectedEventType?.price])

  // Event handlers
  const handleEventTypeSelect = useCallback((eventType: EventType | null) => {
    setSelectedEventTypeOverride(eventType)
    setSelectedDate(undefined)
    setSelectedTimeSlot(null)
    setBookingAttemptId(crypto.randomUUID())
    setPaidAttemptSubmitted(false)
    setDetailsStage('details')
  }, [])

  const handleTimeSlotSelect = useCallback(
    (timeSlot: string | null) => {
      setSelectedTimeSlot(timeSlot)
      if (timeSlot) {
        setFormData(current =>
          current.topic || !storedDecisionQuestion
            ? current
            : { ...current, topic: storedDecisionQuestion }
        )
        setBookingAttemptId(crypto.randomUUID())
        setPaidAttemptSubmitted(false)
        setDetailsStage('details')
        setCurrentStep('booking')
      }
    },
    [storedDecisionQuestion]
  )

  useEffect(() => {
    const timer = window.setInterval(() => setBrowserNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (previousStepRef.current === currentStep) return
    previousStepRef.current = currentStep
    bookingSurfaceRef.current?.scrollIntoView({ block: 'start' })
    const frame = requestAnimationFrame(() => {
      bookingSurfaceRef.current
        ?.querySelector<HTMLElement>('[data-booking-step-heading]')
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [currentStep])

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTimeSlot || !selectedEventType || !selectedDate) {
        throw new Error('Missing required booking data')
      }

      const startTime = new TZDate(selectedTimeSlot, timeZone)
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

  const renderContent = () => (
    <div className="flex min-h-[32rem] w-full flex-col">
      {error && currentStep === 'calendar' && (
        <Alert variant="destructive" className="m-4 w-auto sm:m-6">
          <CircleAlert />
          <AlertTitle>Available times did not load</AlertTitle>
          <AlertDescription>
            <p>Check your connection and try again. Nothing has been booked.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
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
          onChangeMonth={month => setCurrentMonthOverride(new TZDate(month, timeZone))}
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
          onReviewChange={isReviewing => setDetailsStage(isReviewing ? 'review' : 'details')}
          createBookingMutation={createBookingMutation}
          detailsLocked={paidAttemptSubmitted}
        />
      ) : (
        <BookingConfirmationStep />
      )}
    </div>
  )

  return (
    <div
      ref={bookingSurfaceRef}
      className="grid w-full scroll-mt-20 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.55fr)] lg:items-start lg:gap-8"
    >
      <section className="bg-card min-w-0 overflow-hidden rounded-lg border">
        {renderContent()}
      </section>
      <BookingSidebar
        bookingData={bookingData}
        selectedEventType={selectedEventType}
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        currentStep={currentStep}
        detailsStage={detailsStage}
        timeZone={timeZone}
      />
    </div>
  )
}
