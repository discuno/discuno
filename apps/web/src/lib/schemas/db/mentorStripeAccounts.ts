import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorStripeAccounts } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(mentorStripeAccounts, ['id', 'createdAt', 'updatedAt']),
}
const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(mentorStripeAccounts, ['userId', 'stripeAccountId']),
}

export const selectMentorStripeAccountSchema = createSelectSchema(mentorStripeAccounts)
export const insertMentorStripeAccountSchema = createInsertSchema(
  mentorStripeAccounts,
  insertExcludedFields
)
export const updateMentorStripeAccountSchema = createUpdateSchema(
  mentorStripeAccounts,
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
