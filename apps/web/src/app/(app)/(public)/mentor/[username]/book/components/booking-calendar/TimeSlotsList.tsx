import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'

import type { TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Button } from '~/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '~/components/ui/empty'
import { Skeleton } from '~/components/ui/skeleton'

export const TimeSlotsList = ({
  slots,
  isFetchingSlots,
  onSelectTimeSlot,
  timeZone,
  emptyMessage = 'Choose an available date to see times.',
}: {
  slots: TimeSlot[]
  isFetchingSlots: boolean
  onSelectTimeSlot: (timeSlot: string) => void
  timeZone: string
  emptyMessage?: string
}) => {
  if (isFetchingSlots) {
    return (
      <div className="grid grid-cols-2 gap-2" aria-label="Loading available times">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (slots.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-2" aria-live="polite">
        {slots.map(slot => (
          <Button
            key={slot.time}
            type="button"
            variant="outline"
            className="w-full justify-center"
            disabled={!slot.available}
            onClick={() => onSelectTimeSlot(slot.time)}
          >
            <Clock data-icon="inline-start" />
            {format(new TZDate(slot.time, timeZone), 'h:mm a')}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Empty className="min-h-44 py-8 md:py-8" aria-live="polite">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarIcon />
        </EmptyMedia>
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
