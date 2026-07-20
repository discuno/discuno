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
    calcomUserId: integer().notNull().unique(), // Cal.com account ID
    calcomUsername: varchar({ length: 255 }).notNull(), // Regular Cal.com account username
    // Existing rows default to the retired Platform integration until the mentor
    // reconnects through the supported OAuth flow.
    authMode: varchar({ length: 32 })
      .$type<'legacy_platform' | 'oauth'>()
      .notNull()
      .default('legacy_platform'),
    // OAuth credentials are encrypted with the application token key before storage.
    accessToken: text(),
    refreshToken: text(),
    accessTokenExpiresAt: timestamp({
      mode: 'date',
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp({
      mode: 'date',
      withTimezone: true,
    }),
    tokenType: varchar({ length: 32 }),
    scopes: text(),
    // Cal.com v2 webhook IDs are UUID strings. The column remains nullable
    // until provisioning has completed for a newly connected account.
    webhookId: varchar({ length: 255 }),
    // Cal exposes a webhook's signing secret to the owning Cal account. Each
    // connection therefore receives an isolated encrypted secret and opaque
    // callback key; sharing the env fallback across mentors is unsafe.
    webhookSecret: text('webhook_secret'),
    webhookRouteKey: text('webhook_route_key'),
    webhookRouteKeyHash: varchar('webhook_route_key_hash', { length: 64 }).unique(),
    connectedAt: timestamp({ mode: 'date', withTimezone: true }),
    disconnectedAt: timestamp({ mode: 'date', withTimezone: true }),
    lastRefreshAt: timestamp({ mode: 'date', withTimezone: true }),
    ...timestamps,
  },
  table => [
    index('calcom_tokens_user_id_idx').on(table.userId),
    index('calcom_tokens_username_idx').on(table.calcomUsername),
    check('calcom_token_auth_mode_check', sql`${table.authMode} in ('legacy_platform', 'oauth')`),
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
    // Null identifies pre-migration accounts. Those rows temporarily fall back
    // to payoutsEnabled until the next account.updated reconciliation.
    transfersEnabled: boolean(),
    detailsSubmitted: boolean().notNull().default(false),
    requirements: jsonb().default(sql`'{}'::jsonb`),
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
    // Null means the Cal.com configuration has not yet been evaluated by the
    // current Discuno booking contract. Only explicitly compatible rows are
    // eligible for discovery or activation.
    bookingCompatible: boolean('booking_compatible'),
    bookingCompatibilityReasons: jsonb('booking_compatibility_reasons')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    bookingCompatibilityCheckedAt: timestamp('booking_compatibility_checked_at', {
      mode: 'date',
      withTimezone: true,
    }),
    ...softDeleteTimestamps,
  },
  table => [
    index('mentor_event_types_user_idx').on(table.mentorUserId),
    index('mentor_event_types_calcom_idx').on(table.calcomEventTypeId),
    index('mentor_event_types_booking_compatible_idx').on(table.bookingCompatible),
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
