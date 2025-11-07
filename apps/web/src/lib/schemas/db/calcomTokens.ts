import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { calcomToken } from '~/server/db/schema/index'

const insertExcludedFields = {
  ...excludeFields(calcomToken, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(calcomToken, ['userId', 'calcomUserId', 'calcomUsername']),
}

export const selectCalcomTokenSchema = createSelectSchema(calcomToken)
export const insertCalcomTokenSchema = createInsertSchema(calcomToken, {
  ...insertExcludedFields,
  accessTokenExpiresAt: z.preprocess(
    arg => (typeof arg === 'number' ? new Date(arg) : arg),
    z.date()
  ),
  refreshTokenExpiresAt: z.preprocess(
    arg => (typeof arg === 'number' ? new Date(arg) : arg),
    z.date()
  ),
})
export const updateCalcomTokenSchema = createUpdateSchema(calcomToken, updateExcludedFields)

export type CalcomToken = z.infer<typeof selectCalcomTokenSchema>
export type NewCalcomToken = Omit<
  z.infer<typeof insertCalcomTokenSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateCalcomToken = Omit<
  z.infer<typeof updateCalcomTokenSchema>,
  keyof typeof updateExcludedFields
>
