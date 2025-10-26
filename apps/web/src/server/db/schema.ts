import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { softDeleteTimestamps, timestamps } from '~/server/db/columns.helpers'

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */

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

export const post = pgTable(
  'discuno_post',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    random_sort_key: real('random_sort_key').default(Math.random()).notNull(),
    ...softDeleteTimestamps,
  },
  example => [
    index('created_by_idx').on(example.createdById),
    index('created_at_created_by_idx').on(example.createdAt, example.createdById),
    index('posts_created_at_partial_idx')
      .on(example.createdAt)
      .where(sql`deleted_at IS NULL`),
  ]
)

export const postsRelation = relations(post, ({ one }) => ({
  creator: one(user, { fields: [post.createdById], references: [user.id] }), // Link 'createdById' with 'users.id'
}))

export const usersRelation = relations(user, ({ many, one }) => ({
  accounts: many(account),
  calcomTokens: one(calcomToken),
  stripeAccount: one(mentorStripeAccount),
  mentorEventTypes: many(mentorEventType),
}))

export const accountsRelation = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const sessionsRelation = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

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

export const userProfilesRelation = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}))

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

export const major = pgTable('discuno_major', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
  ...timestamps,
})

export const school = pgTable('discuno_school', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).unique().notNull(),
  domainPrefix: varchar({ length: 100 }).unique().notNull(), // e.g., 'stanford' for stanford.edu
  location: varchar({ length: 255 }).notNull(),
  image: varchar({ length: 255 }),
  primaryColor: varchar({ length: 7 }), // e.g., '#RRGGBB'
  secondaryColor: varchar({ length: 7 }), // e.g., '#RRGGBB'
  ...timestamps,
})

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

export const calcomTokenRelation = relations(calcomToken, ({ one }) => ({
  user: one(user, { fields: [calcomToken.userId], references: [user.id] }),
}))

// Mentor Stripe account information
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

export const mentorStripeAccountRelation = relations(mentorStripeAccount, ({ one }) => ({
  user: one(user, { fields: [mentorStripeAccount.userId], references: [user.id] }),
}))

// Mentor event type preferences and pricing (junction table)
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

export const mentorEventTypeRelation = relations(mentorEventType, ({ one, many }) => ({
  user: one(user, { fields: [mentorEventType.mentorUserId], references: [user.id] }),
  bookings: many(booking),
}))

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

// Payment status enum
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

export const paymentRelation = relations(payment, ({ one }) => ({
  mentorUser: one(user, { fields: [payment.mentorUserId], references: [user.id] }),
}))

export const analyticsEventEnum = pgEnum('analytics_event_type', [
  'PROFILE_VIEW',
  'POST_LIKE',
  'DISCORD_ACTIVITY',
  'CHAT_REPLY',
  'COMPLETED_BOOKING',
  'CANCELLED_BOOKING',
])

export const analyticEvent = pgTable(
  'discuno_analytics_event',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    eventType: analyticsEventEnum().notNull(),
    actorUserId: uuid().references(() => user.id, {
      onDelete: 'set null',
    }), // User performing the action (optional)
    targetUserId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: 'no action',
      }), // User being acted upon
    postId: integer().references(() => post.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    distinctId: varchar({ length: 255 }), // PostHog distinct_id (anonymous or authenticated)
    processed: boolean().default(false).notNull(),
    ...softDeleteTimestamps,
  },
  table => [
    index('analytics_events_event_type_idx').on(table.eventType),
    index('analytics_events_actor_user_id_idx').on(table.actorUserId),
    index('analytics_events_target_user_id_idx').on(table.targetUserId),
    index('analytics_events_post_id_idx').on(table.postId),
    index('analytics_events_distinct_id_idx').on(table.distinctId),
  ]
)
