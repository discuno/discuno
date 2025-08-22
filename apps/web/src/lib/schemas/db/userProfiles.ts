import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { userProfiles } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(userProfiles, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(userProfiles, ['userId']),
}

export const selectUserProfileSchema = createSelectSchema(userProfiles)
export const insertUserProfileSchema = createInsertSchema(userProfiles, insertExcludedFields)
export const updateUserProfileSchema = createUpdateSchema(userProfiles, updateExcludedFields)

export type UserProfile = z.infer<typeof selectUserProfileSchema>
export type NewUserProfile = Omit<
  z.infer<typeof insertUserProfileSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateUserProfile = Omit<
  z.infer<typeof updateUserProfileSchema>,
  keyof typeof updateExcludedFields
>
