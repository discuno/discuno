import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { timestamps } from '~/server/db/columns.helpers'

/** Durable inbox for signed Cal.com events before asynchronous processing. */
export const calcomWebhookInbox = pgTable(
  'discuno_calcom_webhook_inbox',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    dedupeKey: varchar('dedupe_key', { length: 64 }).notNull(),
    triggerEvent: varchar('trigger_event', { length: 100 }).notNull(),
    // Null only for the temporary shared-secret migration path. New webhook
    // deliveries are bound to the exact Discuno/Cal connection before enqueue.
    connectionUserId: uuid('connection_user_id'),
    calcomUserId: integer('calcom_user_id'),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    eventCreatedAt: timestamp('event_created_at', { mode: 'date', withTimezone: true }),
    queuedAt: timestamp('queued_at', { mode: 'date', withTimezone: true }),
    processingStartedAt: timestamp('processing_started_at', {
      mode: 'date',
      withTimezone: true,
    }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    quarantinedAt: timestamp('quarantined_at', { mode: 'date', withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: varchar('last_error', { length: 500 }),
    ...timestamps,
  },
  table => [
    uniqueIndex('calcom_webhook_inbox_dedupe_key_uidx').on(table.dedupeKey),
    index('calcom_webhook_inbox_processed_at_idx').on(table.processedAt),
    index('calcom_webhook_inbox_quarantined_at_idx').on(table.quarantinedAt),
    index('calcom_webhook_inbox_processing_started_at_idx').on(table.processingStartedAt),
    index('calcom_webhook_inbox_connection_idx').on(table.connectionUserId, table.calcomUserId),
  ]
)

/**
 * Durable outbox for deleting a webhook from a Cal.com account that is no
 * longer connected. Credentials are copied transactionally before the active
 * connection is replaced or cleared, then scrubbed after success or quarantine.
 * The user ID intentionally has no foreign key so account deletion cannot strand
 * a provider-owned webhook before cleanup runs.
 */
export const calcomWebhookCleanup = pgTable(
  'discuno_calcom_webhook_cleanup',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid('user_id').notNull(),
    calcomUserId: integer('calcom_user_id').notNull(),
    webhookId: varchar('webhook_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
      withTimezone: true,
    }),
    queuedAt: timestamp('queued_at', { mode: 'date', withTimezone: true }),
    processingStartedAt: timestamp('processing_started_at', {
      mode: 'date',
      withTimezone: true,
    }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    quarantinedAt: timestamp('quarantined_at', { mode: 'date', withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: varchar('last_error', { length: 500 }),
    ...timestamps,
  },
  table => [
    uniqueIndex('calcom_webhook_cleanup_webhook_id_uidx').on(table.webhookId),
    index('calcom_webhook_cleanup_processed_at_idx').on(table.processedAt),
    index('calcom_webhook_cleanup_user_account_idx').on(table.userId, table.calcomUserId),
    index('calcom_webhook_cleanup_quarantined_at_idx').on(table.quarantinedAt),
    index('calcom_webhook_cleanup_processing_started_at_idx').on(table.processingStartedAt),
  ]
)

/** Durable, payload-free receipt ledger for verified Stripe events. */
export const stripeWebhookInbox = pgTable(
  'discuno_stripe_webhook_inbox',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 255 }).notNull(),
    source: varchar({ length: 32 }).$type<'platform' | 'connect'>().notNull(),
    connectedAccountId: varchar('connected_account_id', { length: 255 }),
    queuedAt: timestamp('queued_at', { mode: 'date', withTimezone: true }),
    processingStartedAt: timestamp('processing_started_at', {
      mode: 'date',
      withTimezone: true,
    }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    quarantinedAt: timestamp('quarantined_at', { mode: 'date', withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: varchar('last_error', { length: 500 }),
    ...timestamps,
  },
  table => [
    uniqueIndex('stripe_webhook_inbox_event_id_uidx').on(table.eventId),
    index('stripe_webhook_inbox_processed_at_idx').on(table.processedAt),
    index('stripe_webhook_inbox_quarantined_at_idx').on(table.quarantinedAt),
    index('stripe_webhook_inbox_processing_started_at_idx').on(table.processingStartedAt),
    check('stripe_webhook_inbox_source_check', sql`${table.source} in ('platform', 'connect')`),
    check(
      'stripe_webhook_inbox_account_check',
      sql`(${table.source} = 'platform' and ${table.connectedAccountId} is null) or (${table.source} = 'connect')`
    ),
  ]
)
