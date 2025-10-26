import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { updateUserSchema } from '~/lib/schemas/db/users'
import { userProfile } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(userProfile, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(userProfile, ['userId']),
}

export const selectUserProfileSchema = createSelectSchema(userProfile)
export const insertUserProfileSchema = createInsertSchema(userProfile, insertExcludedFields)
export const updateUserProfileSchema = createUpdateSchema(userProfile, updateExcludedFields)

export const updateCompleteProfileSchema = updateUserProfileSchema
  .extend(updateUserSchema.shape)
  .extend({
    school: z.string().optional(),
    major: z.string().optional(),
  })

export type UserProfile = z.infer<typeof selectUserProfileSchema>
export type NewUserProfile = Omit<
  z.infer<typeof insertUserProfileSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateUserProfile = Omit<
  z.infer<typeof updateUserProfileSchema>,
  keyof typeof updateExcludedFields
>
