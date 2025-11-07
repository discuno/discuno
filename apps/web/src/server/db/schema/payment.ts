import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
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
      .references(() => user.id, { onDelete: 'cascade' }),

    customerEmail: varchar({ length: 255 }).notNull(),
    customerName: varchar({ length: 255 }).notNull(),

    amount: integer().notNull(), // in cents
    currency: varchar({ length: 3 }).notNull().default('USD'),

    mentorFee: integer().notNull(), // in cents (amount - platformFee)
    menteeFee: integer().notNull(), // in cents (amount - platformFee)

    mentorAmount: integer().notNull(), // in cents (amount - platformFee)

    platformStatus: paymentStatusEnum().notNull().default('PENDING'),
    stripeStatus: stripePaymentStatusEnum().notNull().default('open'), // Stripe payment status

    transferId: varchar({ length: 255 }), // Stripe transfer ID when funds sent to mentor
    transferStatus: varchar({ length: 50 }), // Transfer status
    transferRetryCount: integer().notNull().default(0), // Number of transfer retry attempts

    disputeRequested: boolean().notNull().default(false), // Admin flag to prevent auto-transfer
    disputePeriodEnds: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),

    metadata: jsonb().default('{}'),

    ...timestamps,
  },
  table => [
    index('payments_mentor_user_id_idx').on(table.mentorUserId),
    index('payments_platform_status_idx').on(table.platformStatus),
    index('payments_dispute_period_ends_idx').on(table.disputePeriodEnds),
    index('payments_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
    index('payments_stripe_checkout_session_id_idx').on(table.stripeCheckoutSessionId),
  ]
)

// Relations
export const paymentRelation = relations(payment, ({ one }) => ({
  mentorUser: one(user, { fields: [payment.mentorUserId], references: [user.id] }),
}))
