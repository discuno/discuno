import type { InferInsertModel } from 'drizzle-orm'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'

/**
 * Test data factories for creating database records in tests
 */

export type CreateUserOptions = Partial<InferInsertModel<typeof schema.user>>
export type CreateUserProfileOptions = Partial<InferInsertModel<typeof schema.userProfile>>
export type CreateSchoolOptions = Partial<InferInsertModel<typeof schema.school>>
export type CreateMajorOptions = Partial<InferInsertModel<typeof schema.major>>
export type CreateCalcomTokenOptions = Partial<InferInsertModel<typeof schema.calcomToken>>
export type CreateMentorEventTypeOptions = Partial<InferInsertModel<typeof schema.mentorEventType>>
export type CreateBookingOptions = Partial<InferInsertModel<typeof schema.booking>>
export type CreatePaymentOptions = Partial<InferInsertModel<typeof schema.payment>>

let userCounter = 0
let schoolCounter = 0
let majorCounter = 0

/**
 * Creates a test user with sensible defaults
 */
export const createTestUser = async (options: CreateUserOptions = {}) => {
  userCounter++
  const user = await testDb
    .insert(schema.user)
    .values({
      name: `Test User ${userCounter}`,
      email: `test-user-${userCounter}-${Date.now()}@example.com`,
      emailVerified: true,
      ...options,
    })
    .returning()

  return user[0]!
}

/**
 * Creates a test user profile
 */
export const createTestUserProfile = async (
  userId: string,
  options: CreateUserProfileOptions = {}
) => {
  const profile = await testDb
    .insert(schema.userProfile)
    .values({
      userId,
      schoolYear: 'Senior',
      graduationYear: 2025,
      bio: 'Test bio',
      rankingScore: 0,
      ...options,
    })
    .returning()

  return profile[0]!
}

/**
 * Creates a test school
 */
export const createTestSchool = async (options: CreateSchoolOptions = {}) => {
  schoolCounter++
  const school = await testDb
    .insert(schema.school)
    .values({
      name: `Test University ${schoolCounter}`,
      domainPrefix: `testuni${schoolCounter}`,
      location: 'Test City, TS',
      ...options,
    })
    .returning()

  return school[0]!
}

/**
 * Creates a test major
 */
export const createTestMajor = async (options: CreateMajorOptions = {}) => {
  majorCounter++
  const major = await testDb
    .insert(schema.major)
    .values({
      name: `Test Major ${majorCounter}`,
      ...options,
    })
    .returning()

  return major[0]!
}

/**
 * Associates a user with a school
 */
export const assignUserToSchool = async (userId: string, schoolId: number) => {
  const userSchool = await testDb.insert(schema.userSchool).values({ userId, schoolId }).returning()

  return userSchool[0]!
}

/**
 * Associates a user with a major
 */
export const assignUserToMajor = async (userId: string, majorId: number) => {
  const userMajor = await testDb.insert(schema.userMajor).values({ userId, majorId }).returning()

  return userMajor[0]!
}

/**
 * Creates a complete user with profile, school, and major
 */
export const createCompleteUser = async (
  options: {
    user?: CreateUserOptions
    profile?: CreateUserProfileOptions
    school?: CreateSchoolOptions
    major?: CreateMajorOptions
  } = {}
) => {
  const user = await createTestUser(options.user)
  const profile = await createTestUserProfile(user.id, options.profile)
  const school = await createTestSchool(options.school)
  const major = await createTestMajor(options.major)

  await assignUserToSchool(user.id, school.id)
  await assignUserToMajor(user.id, major.id)

  return { user, profile, school, major }
}

/**
 * Creates a Cal.com token for a user (making them a mentor)
 */
export const createTestCalcomToken = async (
  userId: string,
  options: CreateCalcomTokenOptions = {}
) => {
  const token = await testDb
    .insert(schema.calcomToken)
    .values({
      userId,
      calcomUserId: Math.floor(Math.random() * 1000000),
      calcomUsername: `testuser${Date.now()}`,
      accessToken: `test_access_token_${Date.now()}`,
      refreshToken: `test_refresh_token_${Date.now()}`,
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days from now
      ...options,
    })
    .returning()

  return token[0]!
}

/**
 * Creates a mentor event type (mentor's available meeting)
 */
export const createTestMentorEventType = async (
  userId: string,
  options: CreateMentorEventTypeOptions = {}
) => {
  const eventType = await testDb
    .insert(schema.mentorEventType)
    .values({
      mentorUserId: userId,
      calcomEventTypeId: Math.floor(Math.random() * 1000000),
      title: 'Test Mentorship Session',
      description: 'A test mentorship session',
      duration: 30,
      customPrice: 2500, // $25.00
      ...options,
    })
    .returning()

  return eventType[0]!
}

/**
 * Creates a complete mentor with Cal.com token and event type
 */
export const createCompleteMentor = async (
  options: {
    user?: CreateUserOptions
    profile?: CreateUserProfileOptions
    school?: CreateSchoolOptions
    major?: CreateMajorOptions
    calcomToken?: CreateCalcomTokenOptions
    eventType?: CreateMentorEventTypeOptions
  } = {}
) => {
  const { user, profile, school, major } = await createCompleteUser({
    user: options.user,
    profile: options.profile,
    school: options.school,
    major: options.major,
  })

  const calcomToken = await createTestCalcomToken(user.id, options.calcomToken)
  const eventType = await createTestMentorEventType(user.id, options.eventType)

  return { user, profile, school, major, calcomToken, eventType }
}

/**
 * Creates a test booking
 */
export const createTestBooking = async (
  eventTypeId: number,
  options: CreateBookingOptions = {}
) => {
  const booking = await testDb
    .insert(schema.booking)
    .values({
      mentorEventTypeId: eventTypeId,
      calcomBookingId: Math.floor(Math.random() * 1000000),
      calcomUid: `test_booking_${Date.now()}`,
      title: 'Test Booking',
      description: 'A test booking',
      startTime: new Date(Date.now() + 24 * 3600 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 3600 * 1000 + 1800 * 1000), // Tomorrow + 30 mins
      status: 'ACCEPTED',
      webhookPayload: { test: true },
      ...options,
    })
    .returning()

  return booking[0]!
}

/**
 * Creates a booking attendee
 */
export const createTestBookingAttendee = async (
  bookingId: number,
  userId: string | null,
  options: Partial<InferInsertModel<typeof schema.bookingAttendee>> = {}
) => {
  const attendee = await testDb
    .insert(schema.bookingAttendee)
    .values({
      bookingId,
      userId,
      name: 'Test Attendee',
      email: `attendee-${Date.now()}@example.com`,
      ...options,
    })
    .returning()

  return attendee[0]!
}

/**
 * Creates a booking organizer (mentor)
 */
export const createTestBookingOrganizer = async (
  bookingId: number,
  userId: string,
  options: Partial<InferInsertModel<typeof schema.bookingOrganizer>> = {}
) => {
  const organizer = await testDb
    .insert(schema.bookingOrganizer)
    .values({
      bookingId,
      userId,
      name: 'Test Organizer',
      email: `organizer-${Date.now()}@example.com`,
      username: `organizer${Date.now()}`,
      ...options,
    })
    .returning()

  return organizer[0]!
}

/**
 * Creates a test payment
 */
export const createTestPayment = async (
  mentorUserId: string,
  options: CreatePaymentOptions = {}
) => {
  const payment = await testDb
    .insert(schema.payment)
    .values({
      mentorUserId,
      stripePaymentIntentId: `pi_test_${Date.now()}`,
      stripeCheckoutSessionId: `cs_test_${Date.now()}`,
      customerEmail: 'customer@example.com',
      customerName: 'Test Customer',
      amount: 2500,
      mentorFee: 2000,
      menteeFee: 500,
      mentorAmount: 2000,
      currency: 'USD',
      platformStatus: 'PENDING',
      stripeStatus: 'open',
      disputePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      ...options,
    })
    .returning()

  return payment[0]!
}

/**
 * Creates a complete booking with attendee, organizer, and payment
 */
export const createCompleteBooking = async (
  mentorEventTypeId: number,
  mentorUserId: string,
  studentUserId: string | null,
  options: {
    booking?: CreateBookingOptions
    payment?: CreatePaymentOptions
    attendee?: Partial<InferInsertModel<typeof schema.bookingAttendee>>
    organizer?: Partial<InferInsertModel<typeof schema.bookingOrganizer>>
  } = {}
) => {
  // Create payment first (booking references it)
  const payment = await createTestPayment(mentorUserId, options.payment)

  // Create booking with payment reference
  const booking = await createTestBooking(mentorEventTypeId, {
    paymentId: payment.id,
    ...options.booking,
  })

  // Create attendee and organizer
  const attendee = await createTestBookingAttendee(booking.id, studentUserId, options.attendee)
  const organizer = await createTestBookingOrganizer(booking.id, mentorUserId, options.organizer)

  return { booking, payment, attendee, organizer }
}

/**
 * Creates a test review
 */
export const createTestReview = async (
  mentorId: string,
  userId: string,
  rating: number,
  review?: string
) => {
  const result = await testDb
    .insert(schema.mentorReview)
    .values({
      mentorId,
      userId,
      rating,
      review,
    })
    .returning()

  return result[0]!
}

/**
 * Creates a test post
 */
export const createTestPost = async (userId: string) => {
  const post = await testDb
    .insert(schema.post)
    .values({
      createdById: userId,
    })
    .returning()

  return post[0]!
}

/**
 * Creates a Stripe account for a mentor
 */
export const createTestStripeAccount = async (
  userId: string,
  options: Partial<InferInsertModel<typeof schema.mentorStripeAccount>> = {}
) => {
  const account = await testDb
    .insert(schema.mentorStripeAccount)
    .values({
      userId,
      stripeAccountId: `acct_test_${Date.now()}`,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      ...options,
    })
    .returning()

  return account[0]!
}
