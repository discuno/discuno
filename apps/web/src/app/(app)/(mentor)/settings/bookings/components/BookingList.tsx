import { CalendarIcon } from 'lucide-react'
import { type Booking } from '~/app/(app)/(mentor)/settings/bookings/components/BookingsPage'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'
import { BookingListItem } from './BookingListItem'

type BookingListProps = {
  bookings: Booking[]
}

export const BookingList = ({ bookings }: BookingListProps) => {
  if (bookings.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>No bookings yet</EmptyTitle>
          <EmptyDescription>
            When someone books a session with you, it will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div>
      {bookings.map(booking => (
        <BookingListItem key={booking.id} booking={booking} />
      ))}
    </div>
  )
}
