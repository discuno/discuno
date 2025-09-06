import { type Booking } from '~/app/(app)/(mentor)/settings/bookings/components/BookingsPage'
import { BookingListItem } from './BookingListItem'

type BookingListProps = {
  bookings: Booking[]
}

export const BookingList = ({ bookings }: BookingListProps) => {
  if (bookings.length === 0) {
    return <p>No bookings to display.</p>
  }

  return (
    <div>
      {bookings.map(booking => (
        <BookingListItem key={booking.id} booking={booking} />
      ))}
    </div>
  )
}
