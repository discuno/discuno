import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorStripeAccount } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(mentorStripeAccount, ['id', 'createdAt', 'updatedAt']),
}
const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(mentorStripeAccount, ['userId', 'stripeAccountId']),
}

export const selectMentorStripeAccountSchema = createSelectSchema(mentorStripeAccount)
export const insertMentorStripeAccountSchema = createInsertSchema(
  mentorStripeAccount,
  insertExcludedFields
)
export const updateMentorStripeAccountSchema = createUpdateSchema(
  mentorStripeAccount,
  updateExcludedFields
)

export type MentorStripeAccount = z.infer<typeof selectMentorStripeAccountSchema>
export type NewMentorStripeAccount = Omit<
  z.infer<typeof insertMentorStripeAccountSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateMentorStripeAccount = Omit<
  z.infer<typeof updateMentorStripeAccountSchema>,
  keyof typeof updateExcludedFields
>
