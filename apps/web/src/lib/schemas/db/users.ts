import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { user } from '~/server/db/schema/index'

const insertExcludedFields = {
  ...excludeFields(user, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(user, ['email', 'emailVerified']),
}

export const selectUserSchema = createSelectSchema(user)
export const insertUserSchema = createInsertSchema(user, insertExcludedFields)
export const updateUserSchema = createUpdateSchema(user, updateExcludedFields)

export type User = z.infer<typeof selectUserSchema>
export type NewUser = Omit<z.infer<typeof insertUserSchema>, keyof typeof insertExcludedFields>
export type UpdateUser = Omit<z.infer<typeof updateUserSchema>, keyof typeof updateExcludedFields>
