import { integer, pgTable, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '~/server/db/columns.helpers'

// Reference data tables
export const major = pgTable('discuno_major', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
  ...timestamps,
})

export const school = pgTable('discuno_school', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).unique().notNull(),
  domainPrefix: varchar({ length: 100 }).unique().notNull(), // e.g., 'stanford' for stanford.edu
  location: varchar({ length: 255 }).notNull(),
  image: varchar({ length: 255 }),
  primaryColor: varchar({ length: 7 }), // e.g., '#RRGGBB'
  secondaryColor: varchar({ length: 7 }), // e.g., '#RRGGBB'
  ...timestamps,
})
