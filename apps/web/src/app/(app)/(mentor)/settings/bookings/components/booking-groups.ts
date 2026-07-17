import type { Booking, BookingGroup } from './booking-types'

const cancelledStatuses = new Set<Booking['status']>(['CANCELLED', 'REJECTED'])
const completedStatuses = new Set<Booking['status']>(['COMPLETED', 'NO_SHOW'])

export const getBookingGroup = (
  booking: Pick<Booking, 'status' | 'endTime'>,
  now: Date
): BookingGroup => {
  if (cancelledStatuses.has(booking.status)) return 'cancelled'
  if (completedStatuses.has(booking.status)) return 'completed'
  return new Date(booking.endTime) > now ? 'upcoming' : 'completed'
}

export const groupBookings = (bookings: Booking[], now: Date): Record<BookingGroup, Booking[]> => {
  const groups: Record<BookingGroup, Booking[]> = {
    upcoming: [],
    completed: [],
    cancelled: [],
  }

  for (const booking of bookings) groups[getBookingGroup(booking, now)].push(booking)

  groups.upcoming.sort(
    (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
  )
  for (const group of [groups.completed, groups.cancelled]) {
    group.sort(
      (left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime()
    )
  }

  return groups
}
