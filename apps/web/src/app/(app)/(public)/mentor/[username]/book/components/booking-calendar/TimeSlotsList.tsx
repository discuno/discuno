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
      <div className="animate-in fade-in space-y-2 duration-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (slots.length > 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 grid gap-2 duration-200">
        {slots.map((slot, index) => (
          <Button
            key={index}
            variant="outline"
            className="animate-in fade-in slide-in-from-bottom-2 w-full justify-start duration-200"
            style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
            disabled={!slot.available}
            onClick={() => onSelectTimeSlot(slot.time)}
          >
            <Clock className="mr-2 h-4 w-4" />
            {format(new Date(slot.time), 'p')}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="text-muted-foreground animate-in fade-in rounded-md border border-dashed p-6 text-center duration-200">
      <CalendarIcon className="mx-auto mb-2 h-8 w-8" />
      <p className="text-sm">Please select an available date</p>
    </div>
  )
}
