import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { timestamps } from '~/server/db/columns.helpers'
import { user } from './user'

// Payment status enums
export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'DISPUTED',
  'REFUNDED',
  'TRANSFERRED',
] as const)

export const stripePaymentStatusEnum = pgEnum('stripe_payment_status', [
  'open',
  'complete',
  'expired',
] as const)

// Payments table to track Stripe payments and transfers
export const payment = pgTable(
  'discuno_payment',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),

    stripePaymentIntentId: varchar({ length: 255 }).notNull().unique(),

    stripeCheckoutSessionId: varchar({ length: 255 }).notNull().unique(),

    mentorUserId: uuid('mentor_user_id')
      .notNull()
      // Financial records must outlive account lifecycle operations; mentor
      // accounts are soft-deleted and hard deletion is blocked while referenced.
      .references(() => user.id, { onDelete: 'restrict' }),

    customerEmail: varchar({ length: 255 }).notNull(),
    customerName: varchar({ length: 255 }).notNull(),

    amount: integer().notNull(), // in cents
    currency: varchar({ length: 3 }).notNull().default('USD'),

    mentorFee: integer().notNull(), // Discuno's 15% commission, in cents
    menteeFee: integer().notNull(), // Legacy buyer fee; zero for the current policy

    mentorAmount: integer().notNull(), // Mentor's 85% share of the listed price, in cents

    // Stripe objects used to reconcile the platform charge and delayed mentor transfer.
    mentorStripeAccountId: varchar('mentor_stripe_account_id', { length: 255 }),
    stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
    transferGroup: varchar('transfer_group', { length: 255 }),
    calcomBookingUid: varchar('calcom_booking_uid', { length: 255 }),

    platformStatus: paymentStatusEnum().notNull().default('PENDING'),
    stripeStatus: stripePaymentStatusEnum().notNull().default('open'), // Stripe payment status

    transferId: varchar({ length: 255 }), // Stripe transfer ID when funds sent to mentor
    transferStatus: varchar({ length: 50 }), // Transfer status
    transferGeneration: integer('transfer_generation').notNull().default(0),
    transferRetryCount: integer().notNull().default(0), // Number of transfer retry attempts
    transferReversalId: varchar('transfer_reversal_id', { length: 255 }),

    stripeRefundId: varchar('stripe_refund_id', { length: 255 }),
    refundStatus: varchar('refund_status', { length: 50 }),
    refundedAmount: integer('refunded_amount'),
    refundedAt: timestamp('refunded_at', {
      mode: 'date',
      withTimezone: true,
    }),
    refundNotifiedAt: timestamp('refund_notified_at', {
      mode: 'date',
      withTimezone: true,
    }),

    // Set only after Inngest accepts the durable fulfillment event. A null value
    // lets a Stripe webhook retry safely requeue work after a transient failure.
    fulfillmentQueuedAt: timestamp({
      mode: 'date',
      withTimezone: true,
    }),

    disputeRequested: boolean().notNull().default(false), // Independent admin hold on mentor transfer
    disputePeriodEnds: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),

    requiresManualReview: boolean('requires_manual_review').notNull().default(false),
    reviewReason: varchar('review_reason', { length: 500 }),

    metadata: jsonb().default(sql`'{}'::jsonb`),

    ...timestamps,
  },
  table => [
    index('payments_mentor_user_id_idx').on(table.mentorUserId),
    index('payments_platform_status_idx').on(table.platformStatus),
    index('payments_dispute_period_ends_idx').on(table.disputePeriodEnds),
    index('payments_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
    index('payments_stripe_checkout_session_id_idx').on(table.stripeCheckoutSessionId),
    index('payments_stripe_charge_id_idx').on(table.stripeChargeId),
    index('payments_stripe_refund_id_idx').on(table.stripeRefundId),
    index('payments_transfer_group_idx').on(table.transferGroup),
    index('payments_calcom_booking_uid_idx').on(table.calcomBookingUid),
    index('payments_manual_review_idx').on(table.requiresManualReview),
  ]
)

/** Immutable-ish Stripe transfer ledger; the payment row keeps only the latest snapshot. */
export const paymentTransfer = pgTable(
  'discuno_payment_transfer',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    paymentId: integer('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    stripeTransferId: varchar('stripe_transfer_id', { length: 255 }).notNull().unique(),
    stripeTransferReversalId: varchar('stripe_transfer_reversal_id', { length: 255 }).unique(),
    generation: integer().notNull(),
    amount: integer().notNull(),
    reversedAmount: integer('reversed_amount').notNull().default(0),
    currency: varchar({ length: 3 }).notNull(),
    destinationAccountId: varchar('destination_account_id', { length: 255 }).notNull(),
    sourceChargeId: varchar('source_charge_id', { length: 255 }).notNull(),
    status: varchar({ length: 50 }).notNull(),
    purpose: varchar({ length: 255 }),
    metadata: jsonb().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  table => [
    uniqueIndex('payment_transfers_payment_generation_uidx').on(table.paymentId, table.generation),
    index('payment_transfers_payment_id_idx').on(table.paymentId),
  ]
)

/** One row per Stripe refund so partial and repeated refunds remain auditable. */
export const paymentRefund = pgTable(
  'discuno_payment_refund',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    paymentId: integer('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    stripeRefundId: varchar('stripe_refund_id', { length: 255 }).notNull().unique(),
    amount: integer().notNull(),
    currency: varchar({ length: 3 }).notNull(),
    status: varchar({ length: 50 }).notNull(),
    purpose: varchar({ length: 255 }),
    metadata: jsonb().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  table => [index('payment_refunds_payment_id_idx').on(table.paymentId)]
)

/** One row per Stripe dispute; multiple disputes can exist for a single charge. */
export const paymentDispute = pgTable(
  'discuno_payment_dispute',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    paymentId: integer('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    stripeDisputeId: varchar('stripe_dispute_id', { length: 255 }).notNull().unique(),
    status: varchar({ length: 50 }).notNull(),
    state: varchar({ length: 20 }).notNull(),
    amount: integer().notNull(),
    currency: varchar({ length: 3 }).notNull(),
    reason: varchar({ length: 100 }),
    evidenceDueBy: timestamp('evidence_due_by', { mode: 'date', withTimezone: true }),
    metadata: jsonb().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  table => [index('payment_disputes_payment_id_idx').on(table.paymentId)]
)

// Relations
export const paymentRelation = relations(payment, ({ one }) => ({
  mentorUser: one(user, { fields: [payment.mentorUserId], references: [user.id] }),
}))

export const paymentTransferRelation = relations(paymentTransfer, ({ one }) => ({
  payment: one(payment, { fields: [paymentTransfer.paymentId], references: [payment.id] }),
}))

export const paymentRefundRelation = relations(paymentRefund, ({ one }) => ({
  payment: one(payment, { fields: [paymentRefund.paymentId], references: [payment.id] }),
}))

export const paymentDisputeRelation = relations(paymentDispute, ({ one }) => ({
  payment: one(payment, { fields: [paymentDispute.paymentId], references: [payment.id] }),
}))
