import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { users } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(users, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(users, ['email', 'emailVerified']),
}

export const selectUserSchema = createSelectSchema(users)
export const insertUserSchema = createInsertSchema(users, insertExcludedFields)
export const updateUserSchema = createUpdateSchema(users, updateExcludedFields)

export type User = z.infer<typeof selectUserSchema>
export type NewUser = Omit<z.infer<typeof insertUserSchema>, keyof typeof insertExcludedFields>
export type UpdateUser = Omit<z.infer<typeof updateUserSchema>, keyof typeof updateExcludedFields>
