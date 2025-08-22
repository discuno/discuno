import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { calcomTokens } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(calcomTokens, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(calcomTokens, ['userId', 'calcomUserId', 'calcomUsername']),
}

export const selectCalcomTokenSchema = createSelectSchema(calcomTokens)
export const insertCalcomTokenSchema = createInsertSchema(calcomTokens, insertExcludedFields)
export const updateCalcomTokenSchema = createUpdateSchema(calcomTokens, updateExcludedFields)

export type CalcomToken = z.infer<typeof selectCalcomTokenSchema>
export type NewCalcomToken = Omit<
  z.infer<typeof insertCalcomTokenSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateCalcomToken = Omit<
  z.infer<typeof updateCalcomTokenSchema>,
  keyof typeof updateExcludedFields
>
