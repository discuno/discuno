import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { softDeleteTimestamps, timestamps } from '~/server/db/columns.helpers'
import { user } from './user'

// Cal.com integration
export const calcomToken = pgTable(
  'discuno_calcom_token',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
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

// Stripe integration
export const stripeAccountStatusEnum = pgEnum('stripe_account_status', [
  'pending',
  'active',
  'restricted',
  'inactive',
] as const)

export const mentorStripeAccount = pgTable(
  'discuno_mentor_stripe_account',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
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

// Event types
export const mentorEventType = pgTable(
  'discuno_mentor_event_type',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    mentorUserId: uuid('mentor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    calcomEventTypeId: integer().unique().notNull(), // The mentor's individual Cal.com event type ID
    isEnabled: boolean().notNull().default(false), // Whether this mentor has enabled this event type
    customPrice: integer().default(0).notNull(), // Price in cents (e.g., 2500 = $25.00)
    currency: varchar({ length: 3 }).notNull().default('USD'),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 500 }),
    duration: integer().notNull(),
    ...softDeleteTimestamps,
  },
  table => [
    index('mentor_event_types_user_idx').on(table.mentorUserId),
    index('mentor_event_types_calcom_idx').on(table.calcomEventTypeId),
    // Compound index for optimizing post visibility checks
    // This allows the EXISTS subquery to be satisfied with a single index lookup
    index('mentor_event_types_active_lookup_idx').on(
      table.mentorUserId,
      table.isEnabled,
      table.customPrice
    ),
  ]
)

// Reviews
export const mentorReview = pgTable(
  'discuno_mentor_review',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    mentorId: uuid('mentor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: integer().notNull(),
    review: varchar({ length: 1000 }),
    ...softDeleteTimestamps,
  },
  table => [check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`)]
)

// Relations
export const calcomTokenRelation = relations(calcomToken, ({ one }) => ({
  user: one(user, { fields: [calcomToken.userId], references: [user.id] }),
}))

export const mentorStripeAccountRelation = relations(mentorStripeAccount, ({ one }) => ({
  user: one(user, { fields: [mentorStripeAccount.userId], references: [user.id] }),
}))
