import { timestamp } from 'drizzle-orm/pg-core'

export const timestamps = {
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}

export const softDeleteTimestamps = {
  ...timestamps,
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}
