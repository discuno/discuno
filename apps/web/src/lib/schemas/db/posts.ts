import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { posts } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(posts, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(posts, ['createdById']),
}

export const selectPostSchema = createSelectSchema(posts)
export const insertPostSchema = createInsertSchema(posts, insertExcludedFields)
export const updatePostSchema = createUpdateSchema(posts, updateExcludedFields)

export type Post = z.infer<typeof selectPostSchema>
export type NewPost = Omit<z.infer<typeof insertPostSchema>, keyof typeof insertExcludedFields>
export type UpdatePost = Omit<z.infer<typeof updatePostSchema>, keyof typeof updateExcludedFields>
