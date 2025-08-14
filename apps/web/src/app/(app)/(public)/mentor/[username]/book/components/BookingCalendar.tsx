import { format } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useMemo } from 'react'

import type { EventType, TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'

// Helper components
const EventTypeSelector = ({
  selectedEventType,
  eventTypes,
  onSelectEventType,
  onSelectTimeSlot,
  className = '',
}: {
  selectedEventType: EventType | null
  eventTypes: EventType[]
  onSelectEventType: (eventType: EventType | null) => void
  onSelectTimeSlot: (timeSlot: string | null) => void
  className?: string
}) => (
  <Select
    value={selectedEventType?.id.toString() ?? ''}
    onValueChange={value => {
      const eventType = eventTypes.find(et => et.id.toString() === value)
      onSelectEventType(eventType ?? null)
      onSelectTimeSlot(null)
    }}
  >
    <SelectTrigger className={className}>
      <SelectValue
        placeholder={className.includes('h-10') ? 'Session Type' : 'Select a session type'}
      />
    </SelectTrigger>
    <SelectContent>
      {eventTypes.map(eventType => (
        <SelectItem key={eventType.id} value={eventType.id.toString()}>
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start">
              <span className="font-medium">{eventType.title}</span>
              <span className="text-muted-foreground text-xs">{eventType.length} minutes</span>
            </div>
            {eventType.price && eventType.price > 0 ? (
              <Badge variant="secondary">
                ${(eventType.price / 100).toFixed(2)} {eventType.currency}
              </Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

const TimeSlotsList = ({
  slots,
  isFetchingSlots,
  onSelectTimeSlot,
}: {
  slots: TimeSlot[]
  isFetchingSlots: boolean
  onSelectTimeSlot: (timeSlot: string) => void
}) => {
  if (isFetchingSlots) {
    return (
      <div className="animate-in fade-in space-y-2 duration-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (slots.length > 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 grid gap-2 duration-200">
        {slots.map((slot, index) => (
          <Button
            key={index}
            variant="outline"
            className="animate-in fade-in slide-in-from-bottom-2 w-full justify-start duration-200"
            style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
            disabled={!slot.available}
            onClick={() => onSelectTimeSlot(slot.time)}
          >
            <Clock className="mr-2 h-4 w-4" />
            {slot.time}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="text-muted-foreground animate-in fade-in rounded-md border border-dashed p-6 text-center duration-200">
      <CalendarIcon className="mx-auto mb-2 h-8 w-8" />
      <p className="text-sm">Please select an available date</p>
    </div>
  )
}

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
}: BookingCalendarProps) => {
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return monthlyAvailability[dateKey] ?? []
  }, [monthlyAvailability, selectedDate])

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
      const dateKey = format(date, 'yyyy-MM-dd')
      return date < today || !monthlyAvailability[dateKey]?.length
    },
    [today, monthlyAvailability]
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex h-full min-h-0 flex-col p-6 duration-200">
      {selectedEventType && (
        <div className="bg-background/80 sticky top-0 z-30 -mx-6 -mt-6 border-b px-6 py-3 supports-[backdrop-filter]:backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            {bookingData.image && (
              <Image
                src={bookingData.image}
                alt={bookingData.name}
                width={40}
                height={40}
                className="ring-border h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-1"
              />
            )}
            <div className="flex-1">
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
      {!selectedEventType && (
        <div className="animate-in fade-in mb-6 duration-200">
          <h2 className="mb-2 text-xl font-semibold">Schedule a Session</h2>
          <p className="text-muted-foreground text-sm">
            Choose your session type, then select a date and time
          </p>
        </div>
      )}

      {/* Event Type Selection (hidden on small screens after selection) */}
      <div
        className={`animate-in fade-in slide-in-from-bottom-2 mb-6 duration-200 ${selectedEventType ? 'hidden md:block' : ''}`}
      >
        <Label className="mb-2 block text-sm font-medium">Session Type</Label>
        <EventTypeSelector
          selectedEventType={selectedEventType}
          eventTypes={eventTypes}
          onSelectEventType={onSelectEventType}
          onSelectTimeSlot={onSelectTimeSlot}
        />
      </div>

      {selectedEventType && (
        <div className="animate-in fade-in slide-in-from-bottom-2 grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-6 duration-200 md:grid-cols-2 md:grid-rows-1">
          {/* Calendar */}
          <div className="min-h-0">
            <Label className="mb-2 hidden text-sm font-medium md:block">Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              disabled={isDateDisabled}
              className="animate-in fade-in slide-in-from-bottom-2 mt-2 rounded-md border duration-200 md:mt-3"
              startMonth={startMonth}
              endMonth={endMonth}
            />
          </div>

          {/* Time Slots */}
          <div className="flex min-h-0 flex-col">
            <Label className="mb-2 hidden text-sm font-medium md:block">Available Times</Label>
            <div className="flex-1 overflow-y-auto pr-1 md:pl-3">
              <TimeSlotsList
                slots={slotsForSelectedDate}
                isFetchingSlots={isFetchingSlots}
                onSelectTimeSlot={onSelectTimeSlot}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
