import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import { cancelCalcomBooking } from '~/lib/calcom'
import { ExternalApiError } from '~/lib/errors'
import { refundBookingPayment } from '~/lib/services/payment-service'
import {
  completeAcceptedBooking,
  createBooking,
  cancelBooking as cancelBookingDal,
  setBookingMentorPayoutEligibility,
  updateBookingStatus,
} from '~/server/dal/bookings'
import { requireOwnedMentorBooking } from '~/server/queries/bookings'

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

/** Persist whether a cancelled booking still earns the mentor payout. */
export const setLocalBookingMentorPayoutEligibility = async (
  calcomBookingUid: string,
  mentorPayoutEligible: boolean
) => setBookingMentorPayoutEligibility(calcomBookingUid, mentorPayoutEligible)

/**
 * Cancel a Cal.com booking after proving it belongs to the authenticated mentor.
 * Authorization must complete before the external API is called.
 */
export const cancelOwnedMentorBooking = async (
  calcomBookingUid: string,
  cancellationReason: string
) => {
  await requireOwnedMentorBooking(calcomBookingUid)
  await cancelCalcomBooking(calcomBookingUid, cancellationReason)
  const refund = await refundBookingPayment(calcomBookingUid, 'mentor_cancelled')
  if (!refund.success) {
    throw new ExternalApiError('The booking was cancelled, but its refund needs manual review')
  }
}

/**
 * Complete an accepted booking once without overwriting no-show/cancelled state.
 */
export const completeLocalBooking = async (calcomBookingUid: string) => {
  return completeAcceptedBooking(calcomBookingUid)
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
