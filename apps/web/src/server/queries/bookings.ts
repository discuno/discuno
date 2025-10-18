'server only'

import { cache } from 'react'
import { getBookingsByMentorId } from '~/server/dal/bookings'

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
