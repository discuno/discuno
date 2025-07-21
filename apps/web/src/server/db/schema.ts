import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'
import { type AdapterAccount } from 'next-auth/adapters'
import { timestamps } from '~/server/db/columns.helpers'

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */

export const users = pgTable('discuno_user', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).unique(),
  emailVerified: timestamp({
    mode: 'date',
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar({ length: 255 }),
  ...timestamps,
})

export const posts = pgTable(
  'discuno_post',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: varchar({ length: 256 }),
    description: text(),
    createdById: varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id),
    ...timestamps,
  },
  example => [
    index('created_by_idx').on(example.createdById),
    index('name_idx').on(example.name),
    index('created_at_created_by_idx').on(example.createdAt, example.createdById),
    index('posts_created_at_partial_idx')
      .on(example.createdAt)
      .where(sql`deleted_at IS NULL`),
  ]
)

export const postsRelations = relations(posts, ({ one }) => ({
  creator: one(users, { fields: [posts.createdById], references: [users.id] }), // Link 'createdById' with 'users.id'
}))

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  calcomTokens: one(calcomTokens),
  stripeAccount: one(mentorStripeAccounts),
  mentorEventTypes: many(mentorEventTypes),
}))

export const accounts = pgTable(
  'discuno_account',
  {
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar({ length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar({ length: 255 }).notNull(),
    // NextAuth requires snake case for these fields
    providerAccountId: varchar({ length: 255 }).notNull(),
    // NextAuth requires snake case for these fields
    refresh_token: text(''),
    access_token: text(''),
    expires_at: integer(),
    token_type: varchar({ length: 255 }),
    scope: varchar({ length: 255 }),
    id_token: text(),
    session_state: varchar({ length: 255 }),
  },
  account => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    index('account_user_id_idx').on(account.userId),
  ]
)

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessions = pgTable(
  'discuno_session',
  {
    sessionToken: varchar({ length: 255 }).notNull().primaryKey(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  session => [index('session_user_id_idx').on(session.userId)]
)

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const verificationTokens = pgTable(
  'discuno_verification_token',
  {
    identifier: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    expires: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  vt => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

export const schoolYearEnum = pgEnum('school_year', [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate',
] as const)

export const userProfiles = pgTable(
  'discuno_user_profile',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: varchar({ length: 1000 }),
    schoolYear: schoolYearEnum().notNull(),
    graduationYear: integer().notNull(), // E.g., 2027
    timezone: varchar({ length: 255 }).notNull().default('UTC'),
    ...timestamps,
  },
  table => ({
    graduationYearSchoolYearIdx: index('graduation_school_year_idx').on(
      table.graduationYear,
      table.schoolYear
    ),
    checkConstraint: check(
      'grad_year_check',
      sql`${table.graduationYear} >= EXTRACT(YEAR FROM CURRENT_DATE)`
    ),
    userProfilesCompoundIdx: index('user_profiles_compound_idx').on(
      table.userId,
      table.graduationYear,
      table.schoolYear
    ),
    partialGradYearIdx: index('user_profiles_grad_year_partial_idx')
      .on(table.graduationYear)
      .where(sql`deleted_at IS NULL`),
  })
)

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

export const userMajors = pgTable(
  'discuno_user_major',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    majorId: integer()
      .notNull()
      .references(() => majors.id),
    ...timestamps,
  },
  table => [index('major_user_compound_idx').on(table.majorId, table.userId)]
)

export const userSchools = pgTable(
  'discuno_user_school',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: integer()
      .notNull()
      .references(() => schools.id),
    ...timestamps,
  },
  table => [
    index('user_school_idx').on(table.userId, table.schoolId),
    index('school_user_compound_idx').on(table.schoolId, table.userId),
  ]
)

export const majors = pgTable('discuno_major', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).unique(),
  ...timestamps,
})

export const schools = pgTable('discuno_school', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).unique(),
  domain: varchar({ length: 255 }).unique(),
  location: varchar({ length: 255 }),
  image: varchar({ length: 255 }),
  ...timestamps,
})

export const mentorReviews = pgTable(
  'discuno_mentor_review',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    mentorId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer().notNull(),
    review: varchar({ length: 1000 }),
    ...timestamps,
  },
  table => [check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`)]
)

export const calcomTokens = pgTable(
  'discuno_calcom_token',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    calcomUserId: integer().notNull(), // Cal.com managed user ID
    calcomUsername: varchar({ length: 255 }).notNull(), // Cal.com generated username
    accessToken: text().notNull(),
    refreshToken: text().notNull(),
    accessTokenExpiresAt: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    refreshTokenExpiresAt: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    ...timestamps,
  },
  table => [
    index('calcom_tokens_user_id_idx').on(table.userId),
    index('calcom_tokens_access_token_idx').on(table.accessToken),
    index('calcom_tokens_username_idx').on(table.calcomUsername),
  ]
)

export const calcomTokensRelations = relations(calcomTokens, ({ one }) => ({
  user: one(users, { fields: [calcomTokens.userId], references: [users.id] }),
}))

export const waitlist = pgTable('discuno_waitlist', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  email: varchar('email', { length: 255 }).notNull(),
  ...timestamps,
})

// Mentor Stripe account information
export const stripeAccountStatusEnum = pgEnum('stripe_account_status', [
  'pending',
  'active',
  'restricted',
  'inactive',
] as const)

export const mentorStripeAccounts = pgTable(
  'discuno_mentor_stripe_account',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeAccountId: varchar({ length: 255 }).notNull().unique(),
    stripeAccountStatus: stripeAccountStatusEnum(),
    onboardingCompleted: timestamp({
      mode: 'date',
      withTimezone: true,
    }),
    payoutsEnabled: boolean().notNull().default(false),
    chargesEnabled: boolean().notNull().default(false),
    detailsSubmitted: boolean().notNull().default(false),
    requirements: jsonb().default('{}'),
    ...timestamps,
  },
  table => [
    index('mentor_stripe_accounts_user_id_idx').on(table.userId),
    index('mentor_stripe_accounts_stripe_account_id_idx').on(table.stripeAccountId),
  ]
)

export const mentorStripeAccountsRelations = relations(mentorStripeAccounts, ({ one }) => ({
  user: one(users, { fields: [mentorStripeAccounts.userId], references: [users.id] }),
}))

// Mentor event type preferences and pricing
export const mentorEventTypes = pgTable(
  'discuno_mentor_event_type',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calcomEventTypeId: integer().notNull(), // Cal.com event type ID from team
    calcomEventTypeSlug: varchar({ length: 255 }).notNull(), // Cal.com event type slug
    isEnabled: boolean().notNull().default(false), // Whether this mentor has enabled this event type
    customPrice: integer(), // Price in cents (e.g., 2500 = $25.00)
    currency: varchar({ length: 3 }).notNull().default('USD'),
    requiresPayment: boolean().notNull().default(false), // Whether this mentor requires payment for this event type
    ...timestamps,
  },
  table => [
    index('mentor_event_types_user_event_type_idx').on(table.userId, table.calcomEventTypeId),
    index('mentor_event_types_user_id_idx').on(table.userId),
    index('mentor_event_types_calcom_event_type_id_idx').on(table.calcomEventTypeId),
    // Ensure one record per user per event type
    unique('mentor_event_types_user_event_type_unique').on(table.userId, table.calcomEventTypeId),
  ]
)

export const mentorEventTypesRelations = relations(mentorEventTypes, ({ one }) => ({
  user: one(users, { fields: [mentorEventTypes.userId], references: [users.id] }),
}))
