'use client'

import { useCallback, useMemo } from 'react'
import type { WeeklySchedule } from '~/app/types/availability'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { DaySchedule } from './DaySchedule'

interface WeeklySchedulerProps {
  schedule: WeeklySchedule
  onScheduleChange: (newSchedule: WeeklySchedule) => void
}

const daysOfWeek = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export function WeeklyScheduler({ schedule, onScheduleChange }: WeeklySchedulerProps) {
  const handleDayToggle = useCallback(
    (day: string, isEnabled: boolean) => {
      const updated = { ...schedule }
      updated[day] = isEnabled
        ? updated[day] && updated[day].length > 0
          ? updated[day]
          : [{ start: '09:00', end: '17:00' }]
        : []
      onScheduleChange(updated)
    },
    [schedule, onScheduleChange]
  )

  const renderDaySchedules = useMemo(() => {
    return daysOfWeek.map(day => (
      <DaySchedule
        key={day}
        day={day}
        intervals={schedule[day] ?? []}
        isEnabled={!!schedule[day]?.length}
        onIntervalsChange={newIntervals => {
          onScheduleChange({ ...schedule, [day]: newIntervals })
        }}
        onDayToggle={isEnabled => handleDayToggle(day, isEnabled)}
      />
    ))
  }, [schedule, onScheduleChange, handleDayToggle])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{renderDaySchedules}</CardContent>
    </Card>
  )
}
