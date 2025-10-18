import type { NewAnalyticsEvent, NewMentorReview } from '~/lib/schemas/db'
import {
  createAnalyticsEvent as createAnalyticsEventDal,
  createMentorReview as createMentorReviewDal,
} from '~/server/dal/analytics'

/**
 * Services Layer for analytics and reviews
 * Handles analytics event tracking and review creation
 */

/**
 * Create an analytics event
 */
export const trackAnalyticsEvent = async (data: NewAnalyticsEvent) => {
  return createAnalyticsEventDal(data)
}

/**
 * Create a mentor review
 */
export const submitMentorReview = async (data: NewMentorReview) => {
  return createMentorReviewDal(data)
}
