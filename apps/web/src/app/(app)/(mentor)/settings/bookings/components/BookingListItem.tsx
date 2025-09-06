import { format } from 'date-fns'
import { type Booking } from '~/app/(app)/(mentor)/settings/bookings/components/BookingsPage'

type BookingListItemProps = {
  booking: Booking
}

export const BookingListItem = ({ booking }: BookingListItemProps) => {
  const startDate = new Date(booking.startTime)
  const endDate = new Date(booking.endTime)

  return (
    <div className="border-b py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-muted-foreground text-sm">{format(startDate, 'EEE, d MMM')}</div>
          <div className="font-medium">
            {format(startDate, 'p')} - {format(endDate, 'p')}
          </div>
        </div>
        <div className="flex-1">
          <div className="font-semibold">{booking.title}</div>
          <div className="text-muted-foreground text-sm">{booking.attendeeName}</div>
        </div>
        <div className="flex-1 text-right">
          {booking.meetingUrl && (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Join Video Call
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
