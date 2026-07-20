'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { DateOverride } from '~/app/types/availability'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '~/components/ui/item'

import { formatDateKey } from './availability-utils'

interface OverrideListItemProps {
  override: DateOverride
  onEdit: () => void
  onDelete: () => void
}

const formatTime = (time: string) =>
  new Date(`2000-01-01T${time}:00`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

export function OverrideListItem({ override, onEdit, onDelete }: OverrideListItemProps) {
  const displayDate = formatDateKey(override.date, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const displayIntervals = override.intervals
    .map(interval => `${formatTime(interval.start)} to ${formatTime(interval.end)}`)
    .join(', ')

  return (
    <Item size="sm" className="flex-nowrap" role="listitem">
      <ItemContent className="min-w-0">
        <ItemTitle>{displayDate}</ItemTitle>
        {override.intervals.length > 0 ? (
          <ItemDescription>{displayIntervals}</ItemDescription>
        ) : (
          <Badge variant="destructive" className="w-fit">
            Needs hours
          </Badge>
        )}
      </ItemContent>
      <ItemActions className="shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={`Edit ${displayDate}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`Remove ${displayDate}`}
        >
          <Trash2 />
        </Button>
      </ItemActions>
    </Item>
  )
}
