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
      <Empty className="border-border min-h-64 border-y">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle role="heading" aria-level={2}>
            {emptyTitle}
          </EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ItemGroup className="border-border divide-border gap-0 divide-y border-y">
      {bookings.map(booking => (
        <BookingListItem key={booking.id} booking={booking} timeZone={timeZone} />
      ))}
    </ItemGroup>
  )
}
