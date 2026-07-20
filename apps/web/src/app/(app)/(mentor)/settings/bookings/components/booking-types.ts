import type { getMentorBookings } from '~/server/queries/bookings'

export type Booking = Awaited<ReturnType<typeof getMentorBookings>>[number]
export type BookingGroup = 'upcoming' | 'completed' | 'cancelled'
