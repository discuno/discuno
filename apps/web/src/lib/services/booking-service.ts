import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import {
  createBooking,
  cancelBooking as cancelBookingDal,
  updateBookingStatus,
} from '~/server/dal/bookings'

/**
 * Services Layer for booking management
 * Handles booking creation, cancellation, and status updates
 */

/**
 * Create a booking with organizer and attendee
 */
type CreateLocalBooking = NewBooking & {
  duration: number
  calcomEventTypeId: number
  organizer: Omit<NewBookingOrganizer, 'bookingId'>
  attendee: Omit<NewBookingAttendee, 'bookingId'>
  meetingUrl?: string
}

export const createLocalBooking = async (input: CreateLocalBooking) => {
  return createBooking(input)
}

/**
 * Cancel a booking
 */
export const cancelLocalBooking = async (calcomBookingUid: string) => {
  return cancelBookingDal(calcomBookingUid)
}

/**
 * Update booking status
 */
export const updateLocalBookingStatus = async (
  calcomBookingUid: string,
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
  options?: {
    hostNoShow?: boolean
    attendeeNoShow?: boolean
  }
) => {
  return updateBookingStatus(calcomBookingUid, status, options)
}
