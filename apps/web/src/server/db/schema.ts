import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTableCreator,
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
export const createTable = pgTableCreator(name => `discuno_${name}`)

export const users = createTable('user', {
  id: varchar('id', { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  emailVerified: timestamp('email_verified', {
    mode: 'date',
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar('image', { length: 255 }),
})

export const posts = createTable(
  'post',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    name: varchar('name', { length: 256 }),
    description: text('description'),
    createdById: varchar('created_by', { length: 255 })
      .notNull()
      .unique()
      .references(() => users.id),
    ...timestamps,
  },
  example => ({
    createdByIdIdx: index('created_by_idx').on(example.createdById),
    nameIndex: index('name_idx').on(example.name),
    createdAtCreatedByIdx: index('created_at_created_by_idx').on(
      example.createdAt,
      example.createdById
    ),
    partialCreatedAtIdx: index('posts_created_at_partial_idx')
      .on(example.createdAt)
      .where(sql`deleted_at IS NULL`),
  })
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

export const accounts = createTable(
  'account',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('account_user_id_idx').on(account.userId),
  })
)

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessions = createTable(
  'session',
  {
    sessionToken: varchar('session_token', { length: 255 }).notNull().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  session => ({
    userIdIdx: index('session_user_id_idx').on(session.userId),
  })
)

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const verificationTokens = createTable(
  'verification_token',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  vt => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

export const userProfiles = createTable(
  'user_profile',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: varchar('bio', { length: 1000 }),
    schoolYear: varchar('school_year', { length: 255 })
      .notNull()
      .$type<'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'>()
      .notNull(),
    graduationYear: integer('graduation_year') // E.g., 2027
      .notNull(),
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

export const userMajors = createTable(
  'user_major',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    majorId: integer('major_id')
      .notNull()
      .references(() => majors.id),
    ...timestamps,
  },
  table => ({
    majorUserCompoundIdx: index('major_user_compound_idx').on(table.majorId, table.userId),
  })
)

export const userSchools = createTable(
  'user_school',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => schools.id),
    ...timestamps,
  },
  table => ({
    userSchoolIdx: index('user_school_idx').on(table.userId, table.schoolId),
    schoolUserCompoundIdx: index('school_user_compound_idx').on(table.schoolId, table.userId),
  })
)

export const majors = createTable('major', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).unique(),
  ...timestamps,
})

export const schools = createTable('school', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).unique(),
  domain: varchar('domain', { length: 255 }).unique(),
  location: varchar('location', { length: 255 }),
  image: varchar('image', { length: 255 }),
  ...timestamps,
})

export const mentorReviews = createTable(
  'mentor_review',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    mentorId: varchar('mentor_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    review: varchar('review', { length: 1000 }),
    ...timestamps,
  },
  table => ({
    checkConstraint: check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  })
)

export const calcomTokens = createTable(
  'calcom_token',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    calcomUserId: integer('calcom_user_id').notNull(), // Cal.com managed user ID
    calcomUsername: varchar('calcom_username', { length: 255 }).notNull(), // Cal.com generated username
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    ...timestamps,
  },
  table => ({
    userIdIdx: index('calcom_tokens_user_id_idx').on(table.userId),
    accessTokenIdx: index('calcom_tokens_access_token_idx').on(table.accessToken),
    calcomUsernameIdx: index('calcom_tokens_username_idx').on(table.calcomUsername),
  })
)

export const calcomTokensRelations = relations(calcomTokens, ({ one }) => ({
  user: one(users, { fields: [calcomTokens.userId], references: [users.id] }),
}))

export const waitlist = createTable('waitlist', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  email: varchar('email', { length: 255 }).notNull(),
  ...timestamps,
})

// Mentor Stripe account information
export const mentorStripeAccounts = createTable(
  'mentor_stripe_account',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeAccountId: varchar('stripe_account_id', { length: 255 }).notNull().unique(),
    stripeAccountStatus: varchar('stripe_account_status', { length: 50 })
      .notNull()
      .default('pending')
      .$type<'pending' | 'active' | 'restricted' | 'inactive'>(),
    onboardingCompleted: timestamp('onboarding_completed', {
      mode: 'date',
      withTimezone: true,
    }),
    payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
    chargesEnabled: boolean('charges_enabled').notNull().default(false),
    detailsSubmitted: boolean('details_submitted').notNull().default(false),
    requirements: jsonb('requirements').default('{}'),
    ...timestamps,
  },
  table => ({
    userIdIdx: index('mentor_stripe_accounts_user_id_idx').on(table.userId),
    stripeAccountIdIdx: index('mentor_stripe_accounts_stripe_account_id_idx').on(
      table.stripeAccountId
    ),
  })
)

export const mentorStripeAccountsRelations = relations(mentorStripeAccounts, ({ one }) => ({
  user: one(users, { fields: [mentorStripeAccounts.userId], references: [users.id] }),
}))

// Mentor event type preferences and pricing
export const mentorEventTypes = createTable(
  'mentor_event_type',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calcomEventTypeId: integer('calcom_event_type_id').notNull(), // Cal.com event type ID from team
    calcomEventTypeSlug: varchar('calcom_event_type_slug', { length: 255 }).notNull(), // Cal.com event type slug
    isEnabled: boolean('is_enabled').notNull().default(false), // Whether this mentor has enabled this event type
    customPrice: integer('custom_price'), // Price in cents (e.g., 2500 = $25.00)
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    requiresPayment: boolean('requires_payment').notNull().default(false), // Whether this mentor requires payment for this event type
    ...timestamps,
  },
  table => ({
    userEventTypeIdx: index('mentor_event_types_user_event_type_idx').on(
      table.userId,
      table.calcomEventTypeId
    ),
    userIdIdx: index('mentor_event_types_user_id_idx').on(table.userId),
    calcomEventTypeIdIdx: index('mentor_event_types_calcom_event_type_id_idx').on(
      table.calcomEventTypeId
    ),
    // Ensure one record per user per event type
    userEventTypeUnique: unique('mentor_event_types_user_event_type_unique').on(
      table.userId,
      table.calcomEventTypeId
    ),
  })
)

export const mentorEventTypesRelations = relations(mentorEventTypes, ({ one }) => ({
  user: one(users, { fields: [mentorEventTypes.userId], references: [users.id] }),
}))
