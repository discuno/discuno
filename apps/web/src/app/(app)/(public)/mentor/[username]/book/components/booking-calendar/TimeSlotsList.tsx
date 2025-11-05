import { format } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'

import type { TimeSlot } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

export const TimeSlotsList = ({
  slots,
  isFetchingSlots,
  onSelectTimeSlot,
}: {
  slots: TimeSlot[]
  isFetchingSlots: boolean
  onSelectTimeSlot: (timeSlot: string) => void
}) => {
  if (isFetchingSlots) {
    return (
      <div className="slide-in-up space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (slots.length > 0) {
    return (
      <div className="slide-in-up space-y-2">
        {slots.map((slot, index) => (
          <Button
            key={index}
            variant="outline"
            className="slide-in-up h-10 w-full justify-center px-3 text-sm"
            style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
            disabled={!slot.available}
            onClick={() => onSelectTimeSlot(slot.time)}
          >
            <Clock className="mr-2 h-3.5 w-3.5" />
            {format(new Date(slot.time), 'p')}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="slide-in-up text-muted-foreground rounded-md border border-dashed p-6 text-center">
      <CalendarIcon className="mx-auto mb-2 h-8 w-8" />
      <p className="text-sm">Please select an available date</p>
    </div>
  )
}
