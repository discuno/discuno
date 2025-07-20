'use client'

import type { DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'

interface OverrideListItemProps {
  override: DateOverride
  onEdit: () => void
  onDelete: () => void
}

export function OverrideListItem({ override, onEdit, onDelete }: OverrideListItemProps) {
  const displayDate = new Date(override.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const displayIntervals =
    override.intervals.length > 0
      ? override.intervals.map(i => `${i.start} - ${i.end}`).join(', ')
      : 'Unavailable'

  return (
    <div className="flex items-center justify-between border-b p-4 last:border-b-0">
      <div>
        <p className="font-medium">{displayDate}</p>
        <p className="text-sm text-gray-500">{displayIntervals}</p>
      </div>
      <div className="space-x-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}
