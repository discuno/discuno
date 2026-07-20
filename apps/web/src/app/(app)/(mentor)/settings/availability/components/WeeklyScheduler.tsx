'use client'

import { Fragment, useCallback, useMemo } from 'react'

import type { WeeklySchedule } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'

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

  const renderDaySchedules = useMemo(
    () =>
      daysOfWeek.map((day, index) => (
        <Fragment key={day}>
          <DaySchedule
            day={day}
            intervals={schedule[day]}
            isEnabled={!!schedule[day].length}
            onIntervalsChange={newIntervals => {
              onScheduleChange({ ...schedule, [day]: newIntervals })
            }}
            onDayToggle={isEnabled => handleDayToggle(day, isEnabled)}
          />
          {index < daysOfWeek.length - 1 && <Separator />}
        </Fragment>
      )),
    [schedule, onScheduleChange, handleDayToggle]
  )

  return (
    <section
      className="border-border flex flex-col gap-5 border-y py-6"
      aria-labelledby="usual-week-heading"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 id="usual-week-heading" className="text-lg font-semibold">
            Usual week
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            Set recurring bookable hours. Times use the timezone in your connected calendar.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-muted-foreground text-sm">
            {availableDayCount === 0
              ? 'No days open'
              : `${availableDayCount} day${availableDayCount === 1 ? '' : 's'} open`}
          </p>
          {availableDayCount === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={applyWeekdayTemplate}
              aria-describedby="weekday-template-description"
            >
              Use weekday hours
            </Button>
          )}
        </div>
      </header>

      <Separator />
      <div>
        {renderDaySchedules}
        {availableDayCount === 0 && (
          <p id="weekday-template-description" className="text-muted-foreground sr-only">
            The weekday template sets Monday through Friday from 9:00 AM to 5:00 PM.
          </p>
        )}
      </div>
    </section>
  )
}
