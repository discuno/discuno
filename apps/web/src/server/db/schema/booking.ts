import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import type { BookingAuditSnapshot } from '~/lib/calcom/booking-audit'
import { softDeleteTimestamps, timestamps } from '~/server/db/columns.helpers'
import { user } from './user'
import { mentorEventType } from './mentor'
import { payment } from './payment'

// Booking status enum
export const bookingStatusEnum = pgEnum('booking_status', [
  'ACCEPTED',
  'PENDING',
  'CANCELLED',
  'REJECTED',
  'COMPLETED',
  'NO_SHOW',
] as const)

/**
 * Privacy-minimal current state for a Cal.com booking UID.
 *
 * This row exists before the full booking snapshot may exist, so terminal
 * webhooks can never be lost merely because BOOKING_CREATED was delivered
 * later. Do not add attendee, organizer, or raw webhook data here.
 */
export const calcomBookingLifecycleStateEnum = pgEnum('calcom_booking_lifecycle_state', [
  'ACTIVE',
  'ATTENDEE_NO_SHOW',
  'COMPLETED',
  'HOST_NO_SHOW',
  'CANCELLED',
] as const)

export const calcomBookingFinancialDispositionEnum = pgEnum(
  'calcom_booking_financial_disposition',
  [
    'NONE',
    'REFUND_EARLY_CANCELLATION',
    'REFUND_MENTOR_CANCELLATION',
    'REFUND_PROVIDER_REJECTION',
    'HOLD_LATE_CANCELLATION',
    'PAYOUT_LATE_CANCELLATION',
    'REFUND_MENTOR_NO_SHOW',
    'PAYOUT_ATTENDEE_NO_SHOW',
    'PAYOUT_COMPLETED',
  ] as const
)

export const calcomBookingLifecycle = pgTable(
  'discuno_calcom_booking_lifecycle',
  {
    calcomUid: varchar({ length: 255 }).primaryKey(),
    calcomBookingId: integer(),
    mentorUserId: uuid().notNull(),
    calcomUserId: integer(),
    state: calcomBookingLifecycleStateEnum().notNull(),
    financialDisposition: calcomBookingFinancialDispositionEnum().notNull().default('NONE'),
    mentorPayoutEligible: boolean('mentor_payout_eligible').notNull().default(false),
    eventCreatedAt: timestamp({ mode: 'date', withTimezone: true }).notNull(),
    sideEffectsClaimedAt: timestamp({ mode: 'date', withTimezone: true }),
    sideEffectsCompletedAt: timestamp({ mode: 'date', withTimezone: true }),
    createdAt: timestamp({ mode: 'date', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    foreignKey({
      name: 'calcom_lifecycle_mentor_fk',
      columns: [table.mentorUserId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    index('calcom_booking_lifecycle_booking_id_idx').on(table.calcomBookingId),
    index('calcom_booking_lifecycle_mentor_user_id_idx').on(table.mentorUserId),
    index('calcom_booking_lifecycle_calcom_user_id_idx').on(table.calcomUserId),
    index('calcom_booking_lifecycle_state_idx').on(table.state),
    index('calcom_booking_lifecycle_event_created_at_idx').on(table.eventCreatedAt),
  ]
)

/**
 * Durable bridge between a client booking attempt, Cal.com's temporary slot
 * hold, and the hosted Stripe Checkout Session. This exists before a payment
 * does, so a retry can reuse its own hold instead of racing or double-reserving
 * the selected time.
 */
export const checkoutSlotReservation = pgTable(
  'discuno_checkout_slot_reservation',
  {
    bookingAttemptId: uuid('booking_attempt_id').primaryKey(),
    // Intentionally no FK: an anonymous actor can be linked and deleted while
    // an open Checkout still carries the captured identity for reconciliation.
    actorUserId: uuid('actor_user_id').notNull(),
    // An active payable Checkout must block hard mentor deletion. Terminal
    // release/consume clears this reference while retaining the audit row.
    mentorUserId: uuid('mentor_user_id'),
    calcomEventTypeId: integer('calcom_event_type_id').notNull(),
    startTime: timestamp('start_time', { mode: 'date', withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    calcomReservationUid: varchar('calcom_reservation_uid', { length: 255 }).unique(),
    reservationUntil: timestamp('reservation_until', { mode: 'date', withTimezone: true }),
    // Written immediately before Cal.com's reservation POST. If the response
    // or the following state write is ambiguous, retries wait for the provider
    // hold window instead of creating a second, untracked reservation.
    reservationAcquisitionStartedAt: timestamp('reservation_acquisition_started_at', {
      mode: 'date',
      withTimezone: true,
    }),
    checkoutExpiresAt: timestamp('checkout_expires_at', { mode: 'date', withTimezone: true }),
    // Exact JSON-normalized Stripe request for this generation. Replays must
    // be byte-for-byte parameter stable under Stripe's idempotency contract.
    checkoutRequestSnapshot: jsonb('checkout_request_snapshot').$type<Record<string, unknown>>(),
    stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }).unique(
      'checkout_reservation_session_unique'
    ),
    generation: integer().notNull().default(1),
    releasedAt: timestamp('released_at', { mode: 'date', withTimezone: true }),
    consumedAt: timestamp('consumed_at', { mode: 'date', withTimezone: true }),
    ...timestamps,
  },
  table => [
    foreignKey({
      name: 'checkout_reservation_mentor_fk',
      columns: [table.mentorUserId],
      foreignColumns: [user.id],
    }).onDelete('restrict'),
    check(
      'checkout_slot_reservation_duration_check',
      sql`${table.durationMinutes} > 0 and ${table.generation} > 0`
    ),
    check(
      'checkout_slot_reservation_active_mentor_check',
      sql`(${table.releasedAt} is not null or ${table.consumedAt} is not null) or ${table.mentorUserId} is not null`
    ),
    index('checkout_slot_reservations_mentor_idx').on(table.mentorUserId),
    index('checkout_slot_reservations_until_idx').on(table.reservationUntil),
    index('checkout_slot_reservations_session_idx').on(table.stripeCheckoutSessionId),
  ]
)

// Bookings table to store Cal.com booking data
export const booking = pgTable(
  'discuno_booking',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    // Cal.com booking identifiers
    calcomBookingId: integer().notNull().unique(), // Cal.com booking ID
    calcomUid: varchar({ length: 255 }).notNull().unique(), // Cal.com UID

    // Booking details snapshot
    title: varchar({ length: 500 }).notNull(),
    description: varchar({ length: 1000 }),
    startTime: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    endTime: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    status: bookingStatusEnum().notNull().default('PENDING'),
    meetingUrl: varchar({ length: 2_048 }),
    hostNoShow: boolean().default(false),
    attendeeNoShow: boolean().default(false),
    // A late mentee cancellation is terminal but still earns the mentor's 85% share.
    // Keeping this explicit prevents cancelled bookings from being paid accidentally.
    mentorPayoutEligible: boolean('mentor_payout_eligible').notNull().default(false),

    // Event type reference
    mentorEventTypeId: integer(),

    // Payment reference (will be set after payment is processed)
    paymentId: integer().references(() => payment.id, { onDelete: 'set null' }),

    // Response data (name, email, location, notes, etc.)
    responses: jsonb().default(sql`'{}'::jsonb`),

    // Privacy-minimal provenance only. The durable inbox holds the signed payload
    // just long enough to process it, then scrubs it; never duplicate attendee PII here.
    webhookPayload: jsonb().$type<BookingAuditSnapshot>().notNull(),

    ...softDeleteTimestamps,
  },
  table => [
    foreignKey({
      name: 'booking_mentor_event_type_fk',
      columns: [table.mentorEventTypeId],
      foreignColumns: [mentorEventType.id],
    }).onDelete('set null'),
    index('bookings_calcom_booking_id_idx').on(table.calcomBookingId),
    index('bookings_calcom_uid_idx').on(table.calcomUid),
    index('bookings_start_time_idx').on(table.startTime),
    index('bookings_status_idx').on(table.status),
    index('bookings_mentor_event_type_id_idx').on(table.mentorEventTypeId),
    index('bookings_payment_id_idx').on(table.paymentId),
    uniqueIndex('bookings_current_payment_id_unique_idx')
      .on(table.paymentId)
      .where(
        sql`${table.deletedAt} is null and (${table.status} <> 'CANCELLED' or ${table.mentorPayoutEligible} = true)`
      ),
  ]
)

// Booking attendees table to store attendee information separately
export const bookingAttendee = pgTable(
  'discuno_booking_attendee',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    bookingId: integer()
      .notNull()
      .references(() => booking.id, { onDelete: 'cascade' }),
    // Future proofing for logged in users
    userId: uuid().references(() => user.id, { onDelete: 'set null' }),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    phoneNumber: varchar({ length: 255 }),
    timeZone: varchar({ length: 100 }),
    ...softDeleteTimestamps,
  },
  table => [
    index('booking_attendees_booking_id_idx').on(table.bookingId),
    index('booking_attendees_user_id_idx').on(table.userId),
    index('booking_attendees_email_idx').on(table.email),
  ]
)

// Booking organizers table to store organizer (mentor) information separately
export const bookingOrganizer = pgTable(
  'discuno_booking_organizer',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    bookingId: integer()
      .notNull()
      .references(() => booking.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 255 }).notNull(),
    ...softDeleteTimestamps,
  },
  table => [
    index('booking_organizers_booking_id_idx').on(table.bookingId),
    index('booking_organizers_user_id_idx').on(table.userId),
    index('booking_organizers_email_idx').on(table.email),
  ]
)

// Relations
export const bookingRelation = relations(booking, ({ one, many }) => ({
  mentorEventType: one(mentorEventType, {
    fields: [booking.mentorEventTypeId],
    references: [mentorEventType.id],
  }),
  payment: one(payment, { fields: [booking.paymentId], references: [payment.id] }),
  attendees: many(bookingAttendee),
  organizers: many(bookingOrganizer),
}))

export const bookingAttendeeRelation = relations(bookingAttendee, ({ one }) => ({
  booking: one(booking, { fields: [bookingAttendee.bookingId], references: [booking.id] }),
  user: one(user, { fields: [bookingAttendee.userId], references: [user.id] }),
}))

export const bookingOrganizerRelation = relations(bookingOrganizer, ({ one }) => ({
  booking: one(booking, { fields: [bookingOrganizer.bookingId], references: [booking.id] }),
  user: one(user, { fields: [bookingOrganizer.userId], references: [user.id] }),
}))
