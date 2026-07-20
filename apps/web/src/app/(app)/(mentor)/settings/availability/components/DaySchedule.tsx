'use client'

import { Plus } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '~/components/ui/field'
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
    <div className="grid gap-4 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
      <Field orientation="horizontal" data-disabled={disabled || undefined}>
        <Switch
          id={`switch-${day}`}
          checked={isEnabled}
          onCheckedChange={onDayToggle}
          disabled={disabled}
        />
        <FieldContent>
          <FieldLabel htmlFor={`switch-${day}`} className="cursor-pointer capitalize">
            {day}
          </FieldLabel>
          <FieldDescription>
            {isEnabled
              ? `${intervals.length} window${intervals.length === 1 ? '' : 's'}`
              : 'Unavailable'}
          </FieldDescription>
        </FieldContent>
      </Field>

      {isEnabled && (
        <div className="flex min-w-0 flex-col gap-3">
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
            variant="ghost"
            size="sm"
            className="self-start"
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
