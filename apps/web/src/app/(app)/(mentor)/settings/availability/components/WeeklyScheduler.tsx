'use client'

import { useCallback, useMemo } from 'react'
import type { WeeklySchedule } from '~/app/types/availability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
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
  // Check if schedule is empty to determine disabled state
  const hasAnyAvailability = useMemo(
    () => daysOfWeek.some(day => schedule[day].length > 0),
    [schedule]
  )

  const isAvailabilityDisabled = !hasAnyAvailability

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

  const handleDisableAllToggle = (disabled: boolean) => {
    if (disabled) {
      // Turn off all days (clear all availability)
      const emptySchedule: WeeklySchedule = {
        sunday: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
      }
      onScheduleChange(emptySchedule)
    } else {
      // Populate weekdays with default 9-5 hours
      const defaultSchedule: WeeklySchedule = {
        sunday: [],
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
      }
      onScheduleChange(defaultSchedule)
    }
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
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Weekly Availability</CardTitle>
            <CardDescription>
              Set your regular weekly hours when you&apos;re available for sessions
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="disable-availability"
              checked={isAvailabilityDisabled}
              onCheckedChange={handleDisableAllToggle}
            />
            <Label
              htmlFor="disable-availability"
              className="cursor-pointer font-normal whitespace-nowrap"
            >
              Disable all
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">{renderDaySchedules}</div>
      </CardContent>
    </Card>
  )
}
