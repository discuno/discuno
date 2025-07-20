'use client'

import { useMemo } from 'react'
import { TimeIntervalRow } from '~/app/(default)/(dashboard)/scheduling/components/availability/TimeIntervalRow'
import type { DateOverride, TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'

interface OverrideFormProps {
  override: DateOverride
  onOverrideChange: (newOverride: DateOverride) => void
  onDelete: () => void
}

const DEFAULT_INTERVAL = { start: '09:00', end: '17:00' }

export const OverrideForm = ({ override, onOverrideChange, onDelete }: OverrideFormProps) => {
  const { date, intervals } = override
  const handleAddInterval = () => {
    onOverrideChange({
      ...override,
      intervals: [...intervals, DEFAULT_INTERVAL],
    })
  }

  const handleRemoveInterval = (index: number) => {
    onOverrideChange({ ...override, intervals: intervals.filter((_, i) => i !== index) })
  }

  const handleIntervalChange = (index: number, updated: TimeInterval) => {
    const newIntervals = intervals.map((interval, i) => (i === index ? updated : interval))
    onOverrideChange({ ...override, intervals: newIntervals })
  }

  const displayDate = useMemo(() => {
    const raw = new Date(date)
    return new Date(raw.valueOf() + raw.getTimezoneOffset() * 60 * 1000) // Adjust for local timezone
  }, [date])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          Editing: {displayDate.toLocaleDateString(undefined, { dateStyle: 'full' })}
        </h3>
      </div>
      <div className="space-y-2">
        {override.intervals.length > 0 ? (
          override.intervals.map((interval, index) => (
            <TimeIntervalRow
              key={index}
              interval={interval}
              onIntervalChange={newInterval => handleIntervalChange(index, newInterval)}
              onRemove={() => handleRemoveInterval(index)}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">No available hours. This day is blocked.</p>
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="link" size="sm" className="px-0" onClick={handleAddInterval}>
          + Add hours
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete Override
        </Button>
      </div>
    </div>
  )
}
