'use client'

import { Trash2 } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

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
      <div className="flex flex-1 items-center gap-2">
        <Input
          type="time"
          value={interval.start}
          onChange={handleStartChange}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="time"
          value={interval.end}
          onChange={handleEndChange}
          disabled={disabled}
          className="flex-1"
        />
      </div>
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
