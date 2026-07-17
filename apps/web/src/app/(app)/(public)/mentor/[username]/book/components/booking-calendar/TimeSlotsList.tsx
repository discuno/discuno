import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'

import type { TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Button } from '~/components/ui/button'
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
      <div className="slide-in-up flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (slots.length > 0) {
    return (
      <div className="slide-in-up grid grid-cols-2 gap-2 md:grid-cols-1">
        {slots.map((slot, index) => (
          <Button
            key={slot.time}
            variant="outline"
            className="slide-in-up h-11 w-full justify-center px-3 text-sm"
            style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
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
    <div className="slide-in-up text-muted-foreground rounded-md border border-dashed p-6 text-center">
      <CalendarIcon className="mx-auto mb-2 h-8 w-8" />
      <p className="text-sm">{emptyMessage}</p>
    </div>
  )
}
