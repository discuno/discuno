import 'server-only'

import { cache } from 'react'
import { requirePermission } from '~/lib/auth/auth-utils'
import { NotFoundError } from '~/lib/errors'
import { getBookingByCalcomUidAndMentorId, getBookingsByMentorId } from '~/server/dal/bookings'

/**
 * Query Layer for bookings
 * Includes caching and joins
 */

/**
 * Get all bookings for a mentor
 */
export const getMentorBookings = cache(async (mentorId: string) => {
  return getBookingsByMentorId(mentorId)
})

/**
 * Resolve a booking owned by the currently authenticated mentor.
 *
 * The same not-found response is used for missing and differently-owned UIDs
 * so callers cannot probe another mentor's booking identifiers.
 */
export const requireOwnedMentorBooking = async (calcomBookingUid: string) => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const booking = await getBookingByCalcomUidAndMentorId(calcomBookingUid, user.id)

  if (!booking) {
    throw new NotFoundError('Booking not found')
  }

  return booking
}
