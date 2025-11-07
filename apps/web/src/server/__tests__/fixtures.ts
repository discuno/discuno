import { eq } from 'drizzle-orm'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'

/**
 * Test fixtures for creating test data.
 * These helpers make it easy to set up test scenarios with realistic data.
 */

export interface TestUser {
  id: string
  name: string | null
  email: string | null
  emailVerified: boolean | null
  image: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface TestUserWithProfile extends TestUser {
  profile: {
    userId: string
    bio: string | null
    schoolYear: string | null
    graduationYear: number | null
    isMentor: boolean
    rankingScore: number
    viewCount: number
  }
}

let userCounter = 0
let schoolCounter = 0
let majorCounter = 0

/**
 * Creates a test user with optional profile data.
 */
export const createTestUser = async (
  overrides?: Partial<typeof schema.user.$inferInsert> & {
    withProfile?: Partial<typeof schema.userProfile.$inferInsert>
  }
): Promise<TestUserWithProfile> => {
  userCounter++
  const email = overrides?.email ?? `test-user-${userCounter}-${Date.now()}@example.com`
  const name = overrides?.name ?? `Test User ${userCounter}`

  const [user] = await testDb
    .insert(schema.user)
    .values({
      email,
      name,
      emailVerified: overrides?.emailVerified ?? true,
      image: overrides?.image,
    })
    .returning()

  if (!user) {
    throw new Error('Failed to create test user')
  }

  const [profile] = await testDb
    .insert(schema.userProfile)
    .values({
      userId: user.id,
      bio: overrides?.withProfile?.bio ?? null,
      schoolYear: overrides?.withProfile?.schoolYear ?? 'Junior',
      graduationYear: overrides?.withProfile?.graduationYear ?? 2025,
      isMentor: overrides?.withProfile?.isMentor ?? false,
      rankingScore: overrides?.withProfile?.rankingScore ?? 0,
      viewCount: overrides?.withProfile?.viewCount ?? 0,
    })
    .returning()

  if (!profile) {
    throw new Error('Failed to create test user profile')
  }

  return { ...user, profile }
}

/**
 * Creates a mentor user with Cal.com token.
 */
export const createTestMentor = async (
  overrides?: Partial<typeof schema.user.$inferInsert> & {
    withProfile?: Partial<typeof schema.userProfile.$inferInsert>
    withCalcomToken?: boolean
    withStripeAccount?: boolean
  }
) => {
  const user = await createTestUser({
    ...overrides,
    withProfile: {
      ...overrides?.withProfile,
      isMentor: true,
    },
  })

  // Create Cal.com token if requested
  if (overrides?.withCalcomToken) {
    await testDb.insert(schema.calcomToken).values({
      userId: user.id,
      accessToken: `test_calcom_token_${user.id}`,
      refreshToken: `test_calcom_refresh_${user.id}`,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      tokenType: 'Bearer',
    })
  }

  // Create Stripe account if requested
  if (overrides?.withStripeAccount) {
    await testDb.insert(schema.mentorStripeAccount).values({
      userId: user.id,
      stripeAccountId: `acct_test_${user.id}`,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    })
  }

  return user
}

/**
 * Creates a test school.
 */
export const createTestSchool = async (overrides?: Partial<typeof schema.school.$inferInsert>) => {
  schoolCounter++
  const [school] = await testDb
    .insert(schema.school)
    .values({
      name: overrides?.name ?? `Test University ${schoolCounter}`,
      domain: overrides?.domain ?? `test${schoolCounter}.edu`,
      logoUrl: overrides?.logoUrl,
    })
    .returning()

  if (!school) {
    throw new Error('Failed to create test school')
  }

  return school
}

/**
 * Creates a test major.
 */
export const createTestMajor = async (overrides?: Partial<typeof schema.major.$inferInsert>) => {
  majorCounter++
  const [major] = await testDb
    .insert(schema.major)
    .values({
      name: overrides?.name ?? `Test Major ${majorCounter}`,
    })
    .returning()

  if (!major) {
    throw new Error('Failed to create test major')
  }

  return major
}

/**
 * Associates a user with a school.
 */
export const associateUserWithSchool = async (userId: string, schoolId: number) => {
  await testDb.insert(schema.userSchool).values({
    userId,
    schoolId,
  })
}

/**
 * Associates a user with a major.
 */
export const associateUserWithMajor = async (userId: string, majorId: number) => {
  await testDb.insert(schema.userMajor).values({
    userId,
    majorId,
  })
}

/**
 * Creates a test post.
 */
export const createTestPost = async (userId: string) => {
  const [post] = await testDb
    .insert(schema.post)
    .values({
      createdById: userId,
    })
    .returning()

  if (!post) {
    throw new Error('Failed to create test post')
  }

  return post
}

/**
 * Creates a test event type for a mentor.
 */
export const createTestEventType = async (
  mentorId: string,
  overrides?: Partial<typeof schema.mentorEventType.$inferInsert>
) => {
  const [eventType] = await testDb
    .insert(schema.mentorEventType)
    .values({
      userId: mentorId,
      calcomEventTypeId: overrides?.calcomEventTypeId ?? Math.floor(Math.random() * 1000000),
      title: overrides?.title ?? 'Test Event',
      slug: overrides?.slug ?? `test-event-${Date.now()}`,
      length: overrides?.length ?? 30,
      price: overrides?.price ?? 50,
      currency: overrides?.currency ?? 'USD',
      ...overrides,
    })
    .returning()

  if (!eventType) {
    throw new Error('Failed to create test event type')
  }

  return eventType
}

/**
 * Creates a test booking.
 */
export const createTestBooking = async (
  mentorId: string,
  attendeeId: string,
  overrides?: Partial<typeof schema.booking.$inferInsert>
) => {
  const eventType = await createTestEventType(mentorId)

  const [booking] = await testDb
    .insert(schema.booking)
    .values({
      calcomBookingId: overrides?.calcomBookingId ?? Math.floor(Math.random() * 1000000),
      calcomUid: overrides?.calcomUid ?? `test-booking-${Date.now()}`,
      title: overrides?.title ?? 'Test Booking',
      startTime: overrides?.startTime ?? new Date(Date.now() + 86400 * 1000), // Tomorrow
      endTime: overrides?.endTime ?? new Date(Date.now() + 86400 * 1000 + 1800 * 1000), // Tomorrow + 30 min
      status: overrides?.status ?? 'ACCEPTED',
      eventTypeId: eventType.id,
      ...overrides,
    })
    .returning()

  if (!booking) {
    throw new Error('Failed to create test booking')
  }

  // Create organizer
  await testDb.insert(schema.bookingOrganizer).values({
    bookingId: booking.id,
    userId: mentorId,
    name: 'Test Mentor',
    email: `mentor-${mentorId}@example.com`,
    timeZone: 'America/New_York',
  })

  // Create attendee
  await testDb.insert(schema.bookingAttendee).values({
    bookingId: booking.id,
    userId: attendeeId,
    name: 'Test Attendee',
    email: `attendee-${attendeeId}@example.com`,
    timeZone: 'America/New_York',
  })

  return booking
}

/**
 * Creates a test payment.
 */
export const createTestPayment = async (
  bookingId: number,
  overrides?: Partial<typeof schema.payment.$inferInsert>
) => {
  const [payment] = await testDb
    .insert(schema.payment)
    .values({
      bookingId,
      stripeCheckoutSessionId: overrides?.stripeCheckoutSessionId ?? `cs_test_${Date.now()}`,
      stripePaymentIntentId: overrides?.stripePaymentIntentId ?? `pi_test_${Date.now()}`,
      amount: overrides?.amount ?? 5000, // $50.00
      currency: overrides?.currency ?? 'USD',
      status: overrides?.status ?? 'succeeded',
      platformFeeAmount: overrides?.platformFeeAmount ?? 500, // $5.00
      mentorAmount: overrides?.mentorAmount ?? 4500, // $45.00
      ...overrides,
    })
    .returning()

  if (!payment) {
    throw new Error('Failed to create test payment')
  }

  return payment
}

/**
 * Creates a test review.
 */
export const createTestReview = async (
  mentorId: string,
  reviewerId: string,
  overrides?: Partial<typeof schema.mentorReview.$inferInsert>
) => {
  const [review] = await testDb
    .insert(schema.mentorReview)
    .values({
      mentorId,
      reviewerId,
      rating: overrides?.rating ?? 5,
      comment: overrides?.comment ?? 'Great mentor!',
      ...overrides,
    })
    .returning()

  if (!review) {
    throw new Error('Failed to create test review')
  }

  return review
}

/**
 * Creates analytics events for a user.
 */
export const createAnalyticsEvent = async (
  targetUserId: string,
  eventType: 'PROFILE_VIEW' | 'COMPLETED_BOOKING' | 'REVIEW_RECEIVED',
  actorUserId?: string
) => {
  const [event] = await testDb
    .insert(schema.analyticEvent)
    .values({
      targetUserId,
      actorUserId,
      eventType,
      processed: false,
    })
    .returning()

  if (!event) {
    throw new Error('Failed to create analytics event')
  }

  return event
}

/**
 * Gets a user with their profile.
 */
export const getUserWithProfile = async (userId: string): Promise<TestUserWithProfile | null> => {
  const user = await testDb.query.user.findFirst({
    where: eq(schema.user.id, userId),
    with: {
      profile: true,
    },
  })

  if (!user || !user.profile) {
    return null
  }

  return {
    ...user,
    profile: user.profile,
  }
}

/**
 * Soft deletes a user.
 */
export const softDeleteUser = async (userId: string) => {
  await testDb.update(schema.user).set({ deletedAt: new Date() }).where(eq(schema.user.id, userId))
}

/**
 * Resets all counters (useful for test isolation).
 */
export const resetCounters = () => {
  userCounter = 0
  schoolCounter = 0
  majorCounter = 0
}
