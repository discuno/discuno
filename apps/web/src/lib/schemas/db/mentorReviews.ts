import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorReviews } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(mentorReviews, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectMentorReviewSchema = createSelectSchema(mentorReviews)
export const insertMentorReviewSchema = createInsertSchema(mentorReviews, excludedFields)

export type MentorReview = z.infer<typeof selectMentorReviewSchema>
export type NewMentorReview = Omit<
  z.infer<typeof insertMentorReviewSchema>,
  keyof typeof excludedFields
>
