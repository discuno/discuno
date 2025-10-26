import 'server-only'

import type { NewAnalyticsEvent, NewMentorReview } from '~/lib/schemas/db'
import { insertAnalyticsEventSchema, insertMentorReviewSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { analyticEvent, mentorReview } from '~/server/db/schema'

/**
 * Data Access Layer for analytics and reviews
 * Raw database operations with no caching or auth checks
 */

/**
 * Create an analytics event
 */
export const createAnalyticsEvent = async (data: NewAnalyticsEvent) => {
  const validatedData = insertAnalyticsEventSchema.parse(data)
  return db.insert(analyticEvent).values(validatedData).returning()
}

/**
 * Create a mentor review
 */
export const createMentorReview = async (data: NewMentorReview) => {
  const validatedData = insertMentorReviewSchema.parse(data)
  return db.insert(mentorReview).values(validatedData).returning()
}
