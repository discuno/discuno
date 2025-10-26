import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { post } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(post, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(post, ['createdById']),
}

export const selectPostSchema = createSelectSchema(post)
export const insertPostSchema = createInsertSchema(post, insertExcludedFields)
export const updatePostSchema = createUpdateSchema(post, updateExcludedFields)

export type Post = z.infer<typeof selectPostSchema>
export type NewPost = Omit<z.infer<typeof insertPostSchema>, keyof typeof insertExcludedFields>
export type UpdatePost = Omit<z.infer<typeof updatePostSchema>, keyof typeof updateExcludedFields>
