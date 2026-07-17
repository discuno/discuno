'use client'

import { Plus } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Switch } from '~/components/ui/switch'
import { getIntervalValidation, getNextAvailableInterval } from './availability-utils'
import { TimeIntervalRow } from './TimeIntervalRow'

interface DayScheduleProps {
  day: string
  intervals: TimeInterval[]
  onIntervalsChange: (newIntervals: TimeInterval[]) => void
  isEnabled: boolean
  onDayToggle: (isEnabled: boolean) => void
  disabled?: boolean
}

export const DaySchedule = ({
  day,
  intervals,
  onIntervalsChange,
  isEnabled,
  onDayToggle,
  disabled = false,
}: DayScheduleProps) => {
  const intervalValidation = getIntervalValidation(intervals)
  const nextInterval = getNextAvailableInterval(intervals)

  const handleAddInterval = () => {
    if (nextInterval) onIntervalsChange([...intervals, nextInterval])
  }

  const handleRemoveInterval = (indexToRemove: number) => {
    onIntervalsChange(intervals.filter((_, i) => i !== indexToRemove))
  }

  const handleIntervalChange = (indexToUpdate: number, updated: TimeInterval) => {
    onIntervalsChange(intervals.map((interval, i) => (i === indexToUpdate ? updated : interval)))
  }

  return (
    <div className="border-foreground/15 bg-card group hover:border-foreground/30 rounded-xl border p-3 transition-colors sm:p-4">
      <Field orientation="horizontal">
        <Switch
          id={`switch-${day}`}
          checked={isEnabled}
          onCheckedChange={onDayToggle}
          disabled={disabled}
        />
        <FieldLabel htmlFor={`switch-${day}`} className="cursor-pointer capitalize">
          {day}
        </FieldLabel>
        {!isEnabled && <span className="text-muted-foreground text-xs">Unavailable</span>}
      </Field>
      {isEnabled && (
        <div className="mt-4 flex flex-col gap-3">
          {intervals.map((interval, index) => (
            <TimeIntervalRow
              key={index}
              interval={interval}
              onIntervalChange={updated => handleIntervalChange(index, updated)}
              onRemove={() => handleRemoveInterval(index)}
              disabled={disabled}
              invalid={intervalValidation?.kind === 'overlap'}
              label={`${day} time window ${index + 1}`}
            />
          ))}
          {intervalValidation?.kind === 'overlap' && (
            <FieldError>{intervalValidation.message}</FieldError>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddInterval}
            disabled={disabled || !nextInterval}
          >
            <Plus data-icon="inline-start" />
            {nextInterval ? 'Add another window' : 'No room for another hour'}
          </Button>
        </div>
      )}
    </div>
  )
}
