'use client'

import { Plus } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import { TimeIntervalRow } from './TimeIntervalRow'

interface DayScheduleProps {
  day: string
  intervals: TimeInterval[]
  onIntervalsChange: (newIntervals: TimeInterval[]) => void
  isEnabled: boolean
  onDayToggle: (isEnabled: boolean) => void
  disabled?: boolean
}

const DEFAULT_INTERVAL = { start: '09:00', end: '17:00' }

export const DaySchedule = ({
  day,
  intervals,
  onIntervalsChange,
  isEnabled,
  onDayToggle,
  disabled = false,
}: DayScheduleProps) => {
  // Handle adding a new interval with default times
  const handleAddInterval = () => {
    onIntervalsChange([...intervals, DEFAULT_INTERVAL])
  }

  // Handle removing an interval by its index
  const handleRemoveInterval = (indexToRemove: number) => {
    onIntervalsChange(intervals.filter((_, i) => i !== indexToRemove))
  }

  // Handle interval changes
  const handleIntervalChange = (indexToUpdate: number, updated: TimeInterval) => {
    onIntervalsChange(intervals.map((interval, i) => (i === indexToUpdate ? updated : interval)))
  }

  return (
    <div className="bg-card hover:border-muted-foreground/50 group rounded-lg border p-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Switch
            id={`switch-${day}`}
            checked={isEnabled}
            onCheckedChange={onDayToggle}
            disabled={disabled}
          />
          <label
            htmlFor={`switch-${day}`}
            className="text-card-foreground cursor-pointer text-sm font-medium capitalize"
          >
            {day}
          </label>
        </div>
        {!isEnabled && <span className="text-muted-foreground text-xs">Unavailable</span>}
      </div>
      {isEnabled && (
        <div className="mt-4 space-y-3">
          {intervals.map((interval, index) => (
            <TimeIntervalRow
              key={index}
              interval={interval}
              onIntervalChange={updated => handleIntervalChange(index, updated)}
              onRemove={() => handleRemoveInterval(index)}
              disabled={disabled}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddInterval}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add time slot
          </Button>
        </div>
      )}
    </div>
  )
}
