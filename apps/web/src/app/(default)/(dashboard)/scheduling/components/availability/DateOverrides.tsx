'use client'

import { useMemo, useState } from 'react'
import type { DateOverride } from '~/app/types/availability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { OverrideCalendar } from './OverrideCalendar'
import { OverrideForm } from './OverrideForm'

interface DateOverridesProps {
  overrides: DateOverride[]
  onOverridesChange: (newOverrides: DateOverride[]) => void
}

const DEFAULT_INTERVAL = [{ start: '09:00', end: '17:00' }]

export const DateOverrides = ({ overrides, onOverridesChange }: DateOverridesProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handleDateSelect = (date: string) => {
    if (selectedDate === date) return

    setSelectedDate(date)
    // If the selected date doesn't have an override yet, create one.
    if (!overrides.some(o => o.date === date)) {
      onOverridesChange([...overrides, { date, intervals: DEFAULT_INTERVAL }])
    }
  }

  const handleOverrideChange = (newOverride: DateOverride) => {
    const updated = overrides.map(o => (o.date === newOverride.date ? newOverride : o))
    onOverridesChange(updated)
  }

  const handleDeleteOverride = (date: string) => {
    const filtered = overrides.filter(o => o.date !== date)
    onOverridesChange(filtered)
    if (selectedDate === date) setSelectedDate(null)
  }

  const selectedOverride = useMemo(
    () => overrides.find(o => o.date === selectedDate),
    [overrides, selectedDate]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Overrides</CardTitle>
        <CardDescription>
          Add or remove specific dates to override your weekly hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <OverrideCalendar
          onDateSelect={handleDateSelect}
          highlightedDates={overrides.map(o => o.date)}
          selectedDate={selectedDate}
        />
        <div className="min-h-[300px]">
          {selectedOverride ? (
            <OverrideForm
              override={selectedOverride}
              onOverrideChange={handleOverrideChange}
              onDelete={() => handleDeleteOverride(selectedOverride.date)}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-gray-50">
              <p className="text-gray-500">Select a date to edit its availability</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
