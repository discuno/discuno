import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { useCallback, useMemo } from 'react'
import type { EventType, TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { EventTypeSelector } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/EventTypeSelector'
import { TimeSlotsList } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/TimeSlotsList'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/types'
import { Calendar } from '~/components/ui/calendar'
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field'

interface BookingCalendarProps {
  selectedEventType: EventType | null
  eventTypes: EventType[]
  selectedDate?: Date
  today: Date
  bookingData: BookingData
  startMonth: Date
  endMonth: Date
  monthlyAvailability: Record<string, TimeSlot[]>
  isFetchingSlots: boolean
  onSelectEventType: (eventType: EventType | null) => void
  onChangeMonth: (month: Date) => void
  onSelectDate: (date?: Date) => void
  onSelectTimeSlot: (timeSlot: string | null) => void
  timeZone: string
}

export const BookingCalendar = ({
  selectedEventType,
  eventTypes,
  selectedDate,
  today,
  bookingData,
  startMonth,
  endMonth,
  monthlyAvailability,
  isFetchingSlots,
  onSelectEventType,
  onChangeMonth,
  onSelectDate,
  onSelectTimeSlot,
  timeZone,
}: BookingCalendarProps) => {
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(new TZDate(selectedDate, timeZone), 'yyyy-MM-dd')
    return monthlyAvailability[dateKey] ?? []
  }, [monthlyAvailability, selectedDate, timeZone])

  const handleDateSelect = useCallback(
    (date?: Date) => {
      if (date) {
        onSelectDate(date)
        onSelectTimeSlot(null)
      }
    },
    [onSelectDate, onSelectTimeSlot]
  )

  const handleMonthChange = useCallback(
    (month: Date) => {
      onChangeMonth(month)
      onSelectDate(undefined)
      onSelectTimeSlot(null)
    },
    [onChangeMonth, onSelectDate, onSelectTimeSlot]
  )

  const isDateDisabled = useCallback(
    (date: Date) => {
      const dateKey = format(new TZDate(date, timeZone), 'yyyy-MM-dd')
      const todayKey = format(new TZDate(today, timeZone), 'yyyy-MM-dd')
      return dateKey < todayKey || !monthlyAvailability[dateKey]?.length
    },
    [today, monthlyAvailability, timeZone]
  )

  const selectedDateLabel = selectedDate
    ? format(new TZDate(selectedDate, timeZone), 'EEEE, MMMM d')
    : null

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-5 py-5 sm:px-7 sm:py-6">
        <h2
          data-booking-step-heading
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight outline-none sm:text-2xl"
        >
          Choose a time
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Times with {bookingData.name} are shown in {timeZone}.
        </p>
      </header>

      <div className="flex flex-col gap-7 p-5 sm:p-7">
        <Field>
          <FieldLabel>Session</FieldLabel>
          <EventTypeSelector
            selectedEventType={selectedEventType}
            eventTypes={eventTypes}
            onSelectEventType={onSelectEventType}
            onSelectTimeSlot={onSelectTimeSlot}
          />
        </Field>

        <section className="border-t pt-7" aria-labelledby="booking-date-time-heading">
          <div className="mb-5">
            <h3 id="booking-date-time-heading" className="text-sm font-medium">
              Date and time
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose an available date, then a start time.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] md:items-start">
            <Field>
              <FieldLabel>Choose a date</FieldLabel>
              <div className="flex min-w-0 justify-center rounded-lg border p-3 sm:p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  onMonthChange={handleMonthChange}
                  disabled={isDateDisabled}
                  className="w-full bg-transparent p-0"
                  startMonth={startMonth}
                  endMonth={endMonth}
                />
              </div>
            </Field>

            <Field>
              <FieldLabel>Choose a time</FieldLabel>
              <FieldDescription>
                {selectedDateLabel ?? 'Select a date to see available times.'}
              </FieldDescription>
              <TimeSlotsList
                slots={slotsForSelectedDate}
                isFetchingSlots={Boolean(selectedDate) && isFetchingSlots}
                onSelectTimeSlot={onSelectTimeSlot}
                timeZone={timeZone}
                emptyMessage={
                  selectedDate
                    ? 'No times remain on this date. Choose another date.'
                    : 'Choose an available date to see times.'
                }
              />
            </Field>
          </div>
        </section>
      </div>
    </div>
  )
}
