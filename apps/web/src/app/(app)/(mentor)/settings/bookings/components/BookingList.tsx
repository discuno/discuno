import { CalendarIcon } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'
import { ItemGroup } from '~/components/ui/item'
import type { Booking } from './booking-types'
import { BookingListItem } from './BookingListItem'

type BookingListProps = {
  bookings: Booking[]
  timeZone: string
  emptyTitle: string
  emptyDescription: string
}

export const BookingList = ({
  bookings,
  timeZone,
  emptyTitle,
  emptyDescription,
}: BookingListProps) => {
  if (bookings.length === 0) {
    return (
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ItemGroup className="gap-3">
      {bookings.map(booking => (
        <BookingListItem key={booking.id} booking={booking} timeZone={timeZone} />
      ))}
    </ItemGroup>
  )
}
