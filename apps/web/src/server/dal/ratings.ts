import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import type { NewMentorReview } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { mentorReviews } from '~/server/db/schema'

/**
 * Data Access Layer for ratings
 * Direct database operations without caching
 */

/**
 * Create a new rating/review for a booking
 */
export const createRating = async (data: NewMentorReview): Promise<number> => {
  const [result] = await db
    .insert(mentorReviews)
    .values(data)
    .returning({ id: mentorReviews.id })

  if (!result) {
    throw new Error('Failed to create rating')
  }

  return result.id
}

/**
 * Update an existing rating/review
 */
export const updateRating = async (
  ratingId: number,
  data: Partial<Pick<NewMentorReview, 'rating' | 'review'>>
): Promise<void> => {
  await db.update(mentorReviews).set(data).where(eq(mentorReviews.id, ratingId))
}

/**
 * Soft delete a rating/review
 */
export const deleteRating = async (ratingId: number): Promise<void> => {
  await db
    .update(mentorReviews)
    .set({ deletedAt: new Date() })
    .where(eq(mentorReviews.id, ratingId))
}

/**
 * Get rating by booking ID
 */
export const getRatingByBookingId = async (
  bookingId: number
): Promise<{ id: number; rating: number; review: string | null } | null> => {
  const rating = await db.query.mentorReviews.findFirst({
    where: and(eq(mentorReviews.bookingId, bookingId), isNull(mentorReviews.deletedAt)),
    columns: {
      id: true,
      rating: true,
      review: true,
    },
  })

  return rating ?? null
}

/**
 * Check if user has already reviewed a booking
 */
export const hasUserReviewedBooking = async (
  bookingId: number,
  userId: string
): Promise<boolean> => {
  const review = await db.query.mentorReviews.findFirst({
    where: and(
      eq(mentorReviews.bookingId, bookingId),
      eq(mentorReviews.userId, userId),
      isNull(mentorReviews.deletedAt)
    ),
    columns: {
      id: true,
    },
  })

  return !!review
}
