'use client'

import { Trash2 } from 'lucide-react'
import { useId } from 'react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { getIntervalValidation } from './availability-utils'

interface TimeIntervalRowProps {
  interval: TimeInterval
  onIntervalChange: (newInterval: TimeInterval) => void
  onRemove?: () => void
  disabled?: boolean
  invalid?: boolean
  label?: string
}

export const TimeIntervalRow = ({
  interval,
  onIntervalChange,
  onRemove,
  disabled = false,
  invalid = false,
  label = 'time window',
}: TimeIntervalRowProps) => {
  const id = useId()
  const startId = `${id}-start`
  const endId = `${id}-end`
  const errorId = `${id}-error`
  const localValidation = getIntervalValidation([interval], { allowEmpty: false })
  const isInvalid = invalid || Boolean(localValidation)

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, start: e.target.value })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, end: e.target.value })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
      <Field className="min-w-0 gap-1.5" data-invalid={isInvalid}>
        <FieldLabel htmlFor={startId}>
          Start <span className="sr-only">for {label}</span>
        </FieldLabel>
        <Input
          id={startId}
          type="time"
          value={interval.start}
          onChange={handleStartChange}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={localValidation ? errorId : undefined}
          className="min-w-0"
        />
      </Field>

      <Field className="min-w-0 gap-1.5" data-invalid={isInvalid}>
        <FieldLabel htmlFor={endId}>
          End <span className="sr-only">for {label}</span>
        </FieldLabel>
        <Input
          id={endId}
          type="time"
          value={interval.end}
          onChange={handleEndChange}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={localValidation ? errorId : undefined}
          className="min-w-0"
        />
      </Field>

      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}

      {localValidation && (
        <FieldError id={errorId} className="col-span-full">
          {localValidation.message}
        </FieldError>
      )}
    </div>
  )
}
