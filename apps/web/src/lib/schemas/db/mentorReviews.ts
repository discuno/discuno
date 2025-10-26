import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorReview } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(mentorReview, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectMentorReviewSchema = createSelectSchema(mentorReview)
export const insertMentorReviewSchema = createInsertSchema(mentorReview, excludedFields)
export type MentorReview = z.infer<typeof selectMentorReviewSchema>
export type NewMentorReview = Omit<
  z.infer<typeof insertMentorReviewSchema>,
  keyof typeof excludedFields
>
