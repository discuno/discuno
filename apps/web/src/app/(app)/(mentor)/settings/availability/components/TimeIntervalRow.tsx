'use client'

import { Clock, Trash2 } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '~/components/ui/input-group'

interface TimeIntervalRowProps {
  interval: TimeInterval
  onIntervalChange: (newInterval: TimeInterval) => void
  onRemove: () => void
  disabled?: boolean
}

export const TimeIntervalRow = ({
  interval,
  onIntervalChange,
  onRemove,
  disabled = false,
}: TimeIntervalRowProps) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, start: e.target.value })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, end: e.target.value })
  }

  return (
    <div className="flex items-center gap-3">
      <InputGroup className="flex-1">
        <InputGroupAddon>
          <Clock className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="time"
          value={interval.start}
          onChange={handleStartChange}
          disabled={disabled}
          aria-label="Start time"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>to</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          type="time"
          value={interval.end}
          onChange={handleEndChange}
          disabled={disabled}
          aria-label="End time"
        />
      </InputGroup>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove time slot"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
