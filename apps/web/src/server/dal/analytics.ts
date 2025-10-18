import 'server-only'

import type { NewAnalyticsEvent, NewMentorReview } from '~/lib/schemas/db'
import { insertAnalyticsEventSchema, insertMentorReviewSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { analyticsEvents, mentorReviews } from '~/server/db/schema'

/**
 * Data Access Layer for analytics and reviews
 * Raw database operations with no caching or auth checks
 */

/**
 * Create an analytics event
 */
export const createAnalyticsEvent = async (data: NewAnalyticsEvent) => {
  const validatedData = insertAnalyticsEventSchema.parse(data)
  return db.insert(analyticsEvents).values(validatedData).returning()
}

/**
 * Create a mentor review
 */
export const createMentorReview = async (data: NewMentorReview) => {
  const validatedData = insertMentorReviewSchema.parse(data)
  return db.insert(mentorReviews).values(validatedData).returning()
}
