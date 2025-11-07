import { index, integer, pgEnum, pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core'
import { softDeleteTimestamps } from '~/server/db/columns.helpers'
import { user } from './user'
import { post } from './post'

export const analyticsEventEnum = pgEnum('analytics_event_type', [
  'PROFILE_VIEW',
  'POST_LIKE',
  'DISCORD_ACTIVITY',
  'CHAT_REPLY',
  'COMPLETED_BOOKING',
  'CANCELLED_BOOKING',
])

export const analyticEvent = pgTable(
  'discuno_analytics_event',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    eventType: analyticsEventEnum().notNull(),
    actorUserId: uuid().references(() => user.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: 'no action',
      }),
    postId: integer().references(() => post.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    distinctId: varchar({ length: 255 }),
    processed: boolean().default(false).notNull(),
    ...softDeleteTimestamps,
  },
  table => [
    index('analytics_events_event_type_idx').on(table.eventType),
    index('analytics_events_actor_user_id_idx').on(table.actorUserId),
    index('analytics_events_target_user_id_idx').on(table.targetUserId),
    index('analytics_events_post_id_idx').on(table.postId),
    index('analytics_events_distinct_id_idx').on(table.distinctId),
  ]
)
