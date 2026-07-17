'use client'

import { useCallback, useMemo } from 'react'
import { CalendarClock, WandSparkles } from 'lucide-react'
import type { WeeklySchedule } from '~/app/types/availability'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
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
  const availableDayCount = useMemo(
    () => daysOfWeek.filter(day => schedule[day].length > 0).length,
    [schedule]
  )

  const handleDayToggle = useCallback(
    (day: (typeof daysOfWeek)[number], isEnabled: boolean) => {
      const updated = { ...schedule }
      updated[day] = isEnabled
        ? updated[day].length > 0
          ? updated[day]
          : [{ start: '09:00', end: '17:00' }]
        : []
      onScheduleChange(updated)
    },
    [schedule, onScheduleChange]
  )

  const applyWeekdayTemplate = () => {
    onScheduleChange({
      sunday: [],
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
    })
  }

  const renderDaySchedules = useMemo(() => {
    return daysOfWeek.map(day => (
      <DaySchedule
        key={day}
        day={day}
        intervals={schedule[day]}
        isEnabled={!!schedule[day].length}
        onIntervalsChange={newIntervals => {
          onScheduleChange({ ...schedule, [day]: newIntervals })
        }}
        onDayToggle={isEnabled => handleDayToggle(day, isEnabled)}
      />
    ))
  }, [schedule, onScheduleChange, handleDayToggle])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border/70 border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <CardTitle>Usual week</CardTitle>
              <CardDescription className="mt-1">
                Turn on a day and add every window when you can meet. Times use the timezone set in
                your connected calendar.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            {availableDayCount === 0
              ? 'No weekly hours'
              : `${availableDayCount} day${availableDayCount === 1 ? '' : 's'} open`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
        {availableDayCount === 0 && (
          <div className="paper-panel bg-muted/40 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm leading-6">
              Start with Monday–Friday, 9:00 AM–5:00 PM, then tailor it to your schedule.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={applyWeekdayTemplate}>
              <WandSparkles data-icon="inline-start" />
              Use weekday hours
            </Button>
          </div>
        )}
        {renderDaySchedules}
      </CardContent>
    </Card>
  )
}
