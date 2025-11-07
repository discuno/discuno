import { relations, sql } from 'drizzle-orm'
import { index, integer, pgTable, real, uuid } from 'drizzle-orm/pg-core'
import { softDeleteTimestamps } from '~/server/db/columns.helpers'
import { user } from './user'

export const post = pgTable(
  'discuno_post',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    random_sort_key: real('random_sort_key').default(Math.random()).notNull(),
    ...softDeleteTimestamps,
  },
  example => [
    index('created_by_idx').on(example.createdById),
    index('created_at_created_by_idx').on(example.createdAt, example.createdById),
    index('posts_created_at_partial_idx')
      .on(example.createdAt)
      .where(sql`deleted_at IS NULL`),
  ]
)

// Relations
export const postsRelation = relations(post, ({ one }) => ({
  creator: one(user, { fields: [post.createdById], references: [user.id] }),
}))
