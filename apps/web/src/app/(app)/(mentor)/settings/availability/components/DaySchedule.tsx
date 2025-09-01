'use client'

import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { TimeIntervalRow } from './TimeIntervalRow'

interface DayScheduleProps {
  day: string
  intervals: TimeInterval[]
  onIntervalsChange: (newIntervals: TimeInterval[]) => void
  isEnabled: boolean
  onDayToggle: (isEnabled: boolean) => void
}

const DEFAULT_INTERVAL = { start: '09:00', end: '17:00' }

export const DaySchedule = ({
  day,
  intervals,
  onIntervalsChange,
  isEnabled,
  onDayToggle,
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

  // Handle checkbox change to toggle the day's availability
  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    onDayToggle(Boolean(checked))
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[150px_1fr]">
      <div className="flex items-center space-x-3">
        <Checkbox id={`check-${day}`} checked={isEnabled} onCheckedChange={handleCheckboxChange} />
        <label htmlFor={`check-${day}`} className="font-semibold capitalize">
          {day}
        </label>
      </div>
      {isEnabled ? (
        <div className="space-y-2">
          {intervals.map((interval, index) => (
            <TimeIntervalRow
              key={index}
              interval={interval}
              onIntervalChange={updated => handleIntervalChange(index, updated)}
              onRemove={() => handleRemoveInterval(index)}
            />
          ))}
          <Button variant="link" size="sm" className="px-0" onClick={handleAddInterval}>
            + Add interval
          </Button>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Unavailable</div>
      )}
    </div>
  )
}
