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
import { softDeleteTimestamps } from '~/server/db/columns.helpers'
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
    meetingUrl: varchar({ length: 255 }),
    hostNoShow: boolean().default(false),
    attendeeNoShow: boolean().default(false),

    // Event type reference
    mentorEventTypeId: integer().references(() => mentorEventType.id, {
      onDelete: 'set null',
    }),

    // Payment reference (will be set after payment is processed)
    paymentId: integer().references(() => payment.id, { onDelete: 'set null' }),

    // Response data (name, email, location, notes, etc.)
    responses: jsonb().default('{}'),

    // Full webhook payload for auditing and future-proofing
    webhookPayload: jsonb().notNull(),

    ...softDeleteTimestamps,
  },
  table => [
    index('bookings_calcom_booking_id_idx').on(table.calcomBookingId),
    index('bookings_calcom_uid_idx').on(table.calcomUid),
    index('bookings_start_time_idx').on(table.startTime),
    index('bookings_status_idx').on(table.status),
    index('bookings_mentor_event_type_id_idx').on(table.mentorEventTypeId),
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
