import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import Image from 'next/image'
import { useCallback, useMemo } from 'react'
import type { EventType, TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { EventTypeSelector } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/EventTypeSelector'
import { TimeSlotsList } from '~/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/TimeSlotsList'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Calendar } from '~/components/ui/calendar'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'

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
      return date < today || !monthlyAvailability[dateKey]?.length
    },
    [today, monthlyAvailability, timeZone]
  )

  return (
    <div className="slide-in-up flex h-full flex-col">
      {/* Header - Mobile Only */}
      {selectedEventType && (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b px-4 py-3 backdrop-blur lg:hidden">
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        {/* Welcome Message */}
        {!selectedEventType && (
          <div className="slide-in-up mb-6">
            <h2 className="mb-2 text-xl font-semibold">Schedule a Session</h2>
            <p className="text-muted-foreground text-sm">
              Choose your session type, then select a date and time
            </p>
          </div>
        )}

        {/* Event Type Selection */}
        <div className={`slide-in-up ${selectedEventType ? 'mb-6 hidden lg:block' : 'mb-6'}`}>
          <Label className="mb-3 block text-sm font-medium">Session Type</Label>
          <EventTypeSelector
            selectedEventType={selectedEventType}
            eventTypes={eventTypes}
            onSelectEventType={onSelectEventType}
            onSelectTimeSlot={onSelectTimeSlot}
          />
        </div>

        {selectedEventType && (
          <>
            <div className="flex flex-col gap-8 xl:flex-row">
              {/* Calendar Section */}
              <div className="bg-card rounded-xl border p-4 shadow-sm xl:flex-1">
                <Label className="mb-4 block text-base font-medium">Select Date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    onMonthChange={handleMonthChange}
                    disabled={isDateDisabled}
                    className="p-0"
                    startMonth={startMonth}
                    endMonth={endMonth}
                  />
                </div>
              </div>

              <Separator className="my-6 xl:hidden" />

              {/* Time Slots Section */}
              <div className="flex-1">
                <Label className="mb-4 block text-base font-medium">
                  Available Times <span className="text-muted-foreground font-normal">({timeZone})</span>
                </Label>
                <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <TimeSlotsList
                    slots={slotsForSelectedDate}
                    isFetchingSlots={isFetchingSlots}
                    onSelectTimeSlot={onSelectTimeSlot}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
