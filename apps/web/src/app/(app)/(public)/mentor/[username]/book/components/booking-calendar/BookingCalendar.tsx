import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import Image from 'next/image'
import { useCallback, useMemo } from 'react'
import type { EventType, TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { EventTypeSelector } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/EventTypeSelector'
import { TimeSlotsList } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/TimeSlotsList'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/types'
import { Calendar } from '~/components/ui/calendar'
import { Label } from '~/components/ui/label'

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

  // Event handlers
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

  return (
    <div className="flex h-full flex-col">
      {/* Header - Mobile Only (Sticky) */}
      {selectedEventType && (
        <div className="bg-background sticky top-0 z-30 border-b px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            {bookingData.image && (
              <Image
                src={bookingData.image}
                alt={bookingData.name}
                width={40}
                height={40}
                className="avatar-ring h-10 w-10 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <EventTypeSelector
                selectedEventType={selectedEventType}
                eventTypes={eventTypes}
                onSelectEventType={onSelectEventType}
                onSelectTimeSlot={onSelectTimeSlot}
                className="h-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex h-full flex-col overflow-hidden md:min-w-[700px] md:flex-row">
        {/* Left Side: Session Type & Calendar */}
        <div className="flex-1 overflow-y-auto border-r-0 p-4 pb-6 md:border-r md:p-6">
          <div className="mx-auto flex max-w-sm flex-col gap-8">
            {/* Session Type Select (Desktop) */}
            <div className="hidden md:block">
              <Label className="text-foreground/80 mb-3 block text-sm font-medium">
                Session type
              </Label>
              <EventTypeSelector
                selectedEventType={selectedEventType}
                eventTypes={eventTypes}
                onSelectEventType={onSelectEventType}
                onSelectTimeSlot={onSelectTimeSlot}
              />
            </div>

            {selectedEventType && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <Label className="text-foreground/80 mb-4 block text-sm font-medium">
                  Choose a date
                </Label>
                {/* Clean, borderless calendar */}
                <div className="flex justify-center md:block">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    onMonthChange={handleMonthChange}
                    disabled={isDateDisabled}
                    className="w-full border-none p-0"
                    startMonth={startMonth}
                    endMonth={endMonth}
                  />
                </div>

                <div className="mt-6 md:hidden">
                  <Label className="text-foreground/80 mb-3 block text-sm font-medium">
                    Choose a time
                  </Label>
                  <TimeSlotsList
                    slots={slotsForSelectedDate}
                    isFetchingSlots={Boolean(selectedDate) && isFetchingSlots}
                    onSelectTimeSlot={onSelectTimeSlot}
                    timeZone={timeZone}
                    emptyMessage={
                      selectedDate
                        ? 'No times remain on this date. Try another day.'
                        : 'Choose an available date to see times.'
                    }
                  />

                  {selectedDate && (
                    <p className="text-muted-foreground mt-2 text-xs">Time zone: {timeZone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Available Times (Desktop Only) */}
        {selectedEventType && (
          <div className="bg-muted/10 hidden flex-1 p-6 md:block md:min-w-[300px]">
            <div className="flex h-full flex-col">
              <Label className="mb-4 block text-base font-medium">Choose a time</Label>
              <p className="text-muted-foreground mb-4 text-xs font-medium">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM do')
                  : 'Select a date to view times'}
                <span className="mt-1 block font-normal opacity-70">{timeZone}</span>
              </p>

              <div className="custom-scrollbar -mr-2 flex-1 overflow-y-auto pr-2">
                {selectedDate ? (
                  <TimeSlotsList
                    slots={slotsForSelectedDate}
                    isFetchingSlots={isFetchingSlots}
                    onSelectTimeSlot={onSelectTimeSlot}
                    timeZone={timeZone}
                    emptyMessage="No times remain on this date. Try another day."
                  />
                ) : (
                  <div className="text-muted-foreground flex h-40 items-center justify-center text-center text-sm">
                    <p>Please select a date from the calendar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
