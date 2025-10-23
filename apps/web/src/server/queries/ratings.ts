import 'server-only'

import { and, avg, count, eq, isNull, sql } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '~/server/db'
import { bookings, mentorReviews, users } from '~/server/db/schema'

/**
 * Query Layer for ratings
 * Includes caching, joins, transformations, and aggregations
 */

/**
 * Get aggregate rating statistics for a mentor
 */
export const getMentorRatingStats = cache(
  async (
    mentorId: string
  ): Promise<{ averageRating: number; totalReviews: number } | null> => {
    const result = await db
      .select({
        averageRating: avg(mentorReviews.rating),
        totalReviews: count(mentorReviews.id),
      })
      .from(mentorReviews)
      .where(and(eq(mentorReviews.mentorId, mentorId), isNull(mentorReviews.deletedAt)))
      .groupBy(mentorReviews.mentorId)

    if (!result[0]) {
      return { averageRating: 0, totalReviews: 0 }
    }

    const avgRating = result[0].averageRating
    const totalReviews = result[0].totalReviews

    return {
      averageRating: avgRating ? Number(avgRating) : 0,
      totalReviews: totalReviews ?? 0,
    }
  }
)

/**
 * Get all reviews for a mentor (with reviewer details)
 */
export const getMentorReviews = cache(
  async (
    mentorId: string
  ): Promise<
    Array<{
      id: number
      rating: number
      review: string | null
      createdAt: Date | null
      reviewerName: string | null
      reviewerImage: string | null
    }>
  > => {
    const reviews = await db
      .select({
        id: mentorReviews.id,
        rating: mentorReviews.rating,
        review: mentorReviews.review,
        createdAt: mentorReviews.createdAt,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(mentorReviews)
      .leftJoin(users, eq(mentorReviews.userId, users.id))
      .where(and(eq(mentorReviews.mentorId, mentorId), isNull(mentorReviews.deletedAt)))
      .orderBy(sql`${mentorReviews.createdAt} DESC`)

    return reviews
  }
)

/**
 * Get review for a specific booking (if exists)
 */
export const getBookingReview = cache(
  async (
    bookingId: number
  ): Promise<{
    id: number
    rating: number
    review: string | null
    createdAt: Date | null
  } | null> => {
    const review = await db.query.mentorReviews.findFirst({
      where: and(eq(mentorReviews.bookingId, bookingId), isNull(mentorReviews.deletedAt)),
      columns: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
      },
    })

    return review ?? null
  }
)

/**
 * Check if a booking can be reviewed
 * A booking can be reviewed if:
 * 1. It's completed
 * 2. It doesn't already have a review
 * 3. The user was an attendee
 */
export const canReviewBooking = cache(
  async (bookingId: number, userId: string): Promise<boolean> => {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      columns: {
        id: true,
        status: true,
      },
      with: {
        attendees: {
          columns: {
            userId: true,
          },
        },
        review: {
          columns: {
            id: true,
          },
        },
      },
    })

    if (!booking) {
      return false
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      return false
    }

    // Check if booking already has a review
    if (booking.review) {
      return false
    }

    // Check if user was an attendee
    const wasAttendee = booking.attendees.some(attendee => attendee.userId === userId)

    return wasAttendee
  }
)
