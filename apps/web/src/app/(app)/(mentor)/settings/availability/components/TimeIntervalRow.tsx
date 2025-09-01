'use client'

import { Trash2 } from 'lucide-react'
import type { TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

interface TimeIntervalRowProps {
  interval: TimeInterval
  onIntervalChange: (newInterval: TimeInterval) => void
  onRemove: () => void
}

export const TimeIntervalRow = ({ interval, onIntervalChange, onRemove }: TimeIntervalRowProps) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, start: e.target.value })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onIntervalChange({ ...interval, end: e.target.value })
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="time" value={interval.start} onChange={handleStartChange} className="w-full" />
      <span>-</span>
      <Input type="time" value={interval.end} onChange={handleEndChange} className="w-full" />
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove interval">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
