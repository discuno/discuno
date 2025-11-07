import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { softDeleteTimestamps, timestamps } from '~/server/db/columns.helpers'
import { major, school } from './reference'

// User authentication tables
export const user = pgTable('discuno_user', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).unique(),
  emailVerified: boolean().default(false),
  image: varchar({ length: 255 }),
  ...timestamps,
  ...softDeleteTimestamps,
})

export const session = pgTable('discuno_user_session', {
  id: text().primaryKey(),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: uuid()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export const account = pgTable(
  'discuno_account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  account => [index('account_user_id_idx').on(account.userId)]
)

export const verification = pgTable('discuno_verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  ...timestamps,
})

// User profile and metadata
export const schoolYearEnum = pgEnum('school_year', [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate',
] as const)

export const userProfile = pgTable(
  'discuno_user_profile',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    bio: varchar({ length: 1000 }),
    schoolYear: schoolYearEnum().notNull(),
    graduationYear: integer().notNull(), // E.g., 2027
    timezone: varchar({ length: 255 }).notNull().default('UTC'),
    rankingScore: real().default(0).notNull(),
    ...softDeleteTimestamps,
  },
  table => [
    index('graduation_school_year_idx').on(table.graduationYear, table.schoolYear),
    check('grad_year_check', sql`${table.graduationYear} >= EXTRACT(YEAR FROM CURRENT_DATE)`),
    index('user_profiles_compound_idx').on(table.userId, table.graduationYear, table.schoolYear),
    index('user_profiles_grad_year_partial_idx')
      .on(table.graduationYear)
      .where(sql`deleted_at IS NULL`),
  ]
)

export const userMajor = pgTable(
  'discuno_user_major',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    majorId: integer()
      .notNull()
      .references(() => major.id),
    ...softDeleteTimestamps,
  },
  table => [index('major_user_compound_idx').on(table.majorId, table.userId)]
)

export const userSchool = pgTable(
  'discuno_user_school',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    schoolId: integer()
      .notNull()
      .references(() => school.id),
    ...softDeleteTimestamps,
  },
  table => [
    index('user_school_idx').on(table.userId, table.schoolId),
    index('school_user_compound_idx').on(table.schoolId, table.userId),
  ]
)

// Relations
export const accountsRelation = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const sessionsRelation = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const userProfilesRelation = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}))
