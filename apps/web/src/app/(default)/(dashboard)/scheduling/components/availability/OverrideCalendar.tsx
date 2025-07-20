'use client'

import { useCallback, useMemo } from 'react'
import { Calendar } from '~/components/ui/calendar'
import { cn } from '~/lib/utils/tailwind'

interface OverrideCalendarProps {
  onDateSelect: (date: string) => void
  highlightedDates: string[]
  selectedDate: string | null
}

const toISODate = (date: Date) => {
  return date.toISOString().split('T')[0] // Format to YYYY-MM-DD
}

export function OverrideCalendar({
  onDateSelect,
  highlightedDates,
  selectedDate,
}: OverrideCalendarProps) {
  // The calendar can be slow with many dates, so we memoize this if needed.
  const highlightedModifiers = useMemo(() => {
    return {
      highlighted: highlightedDates.map(date => new Date(date + 'T00:00:00')),
    }
  }, [highlightedDates])

  const handleSelect = useCallback(
    (date?: Date) => {
      if (!date) return
      onDateSelect(toISODate(date) as string)
    },
    [onDateSelect]
  )
  return (
    <Calendar
      mode="single"
      selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
      onSelect={handleSelect}
      modifiers={highlightedModifiers}
      modifiersClassNames={{
        highlighted: 'bg-blue-100 text-blue-800 rounded-full',
      }}
      className={cn('rounded-md border')}
    />
  )
}
