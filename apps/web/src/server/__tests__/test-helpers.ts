import { eq } from 'drizzle-orm'
import { testDb } from '~/server/db/test-db'
import {
  users,
  userProfiles,
  calcomTokens,
  mentorEventTypes,
  mentorStripeAccounts,
  bookings,
  bookingAttendees,
  bookingOrganizers,
  payments,
  schools,
  majors,
  userSchools,
  userMajors,
} from '~/server/db/schema'

/**
 * Test helper utilities for creating test data
 */

export interface TestUser {
  id: string
  name: string | null
  email: string | null
}

export interface TestProfile {
  id: number
  userId: string
  bio: string | null
  schoolYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear: number
  rankingScore: number
}

/**
 * Create a test user with profile
 */
export const createTestUser = async (data?: {
  name?: string
  email?: string
  bio?: string
  schoolYear?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear?: number
}): Promise<{ user: TestUser; profile: TestProfile }> => {
  const userData = {
    name: data?.name ?? 'Test User',
    email: data?.email ?? `test-${Date.now()}@example.com`,
  }

  const [user] = await testDb.insert(users).values(userData).returning()

  if (!user) {
    throw new Error('Failed to create test user')
  }

  const profileData = {
    userId: user.id,
    bio: data?.bio ?? null,
    schoolYear: data?.schoolYear ?? 'Senior',
    graduationYear: data?.graduationYear ?? 2025,
    rankingScore: 0,
  }

  const [profile] = await testDb.insert(userProfiles).values(profileData).returning()

  if (!profile) {
    throw new Error('Failed to create test profile')
  }

  return { user, profile }
}

/**
 * Create Cal.com tokens for a user
 */
export const createTestCalcomTokens = async (
  userId: string,
  data?: {
    calcomUserId?: number
    calcomUsername?: string
    accessToken?: string
    refreshToken?: string
  }
) => {
  const tokenData = {
    userId,
    calcomUserId: data?.calcomUserId ?? Math.floor(Math.random() * 100000),
    calcomUsername: data?.calcomUsername ?? `testuser${Date.now()}`,
    accessToken: data?.accessToken ?? `test_access_token_${Date.now()}`,
    refreshToken: data?.refreshToken ?? `test_refresh_token_${Date.now()}`,
    accessTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    refreshTokenExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
  }

  const [tokens] = await testDb.insert(calcomTokens).values(tokenData).returning()

  if (!tokens) {
    throw new Error('Failed to create Cal.com tokens')
  }

  return tokens
}

/**
 * Create mentor event types
 */
export const createTestEventType = async (
  mentorUserId: string,
  data?: {
    calcomEventTypeId?: number
    title?: string
    description?: string
    duration?: number
    isEnabled?: boolean
    customPrice?: number
    currency?: string
  }
) => {
  const eventTypeData = {
    mentorUserId,
    calcomEventTypeId: data?.calcomEventTypeId ?? Math.floor(Math.random() * 100000),
    title: data?.title ?? 'Test Event Type',
    description: data?.description ?? 'Test description',
    duration: data?.duration ?? 30,
    isEnabled: data?.isEnabled ?? false,
    customPrice: data?.customPrice ?? 0,
    currency: data?.currency ?? 'USD',
  }

  const [eventType] = await testDb.insert(mentorEventTypes).values(eventTypeData).returning()

  if (!eventType) {
    throw new Error('Failed to create event type')
  }

  return eventType
}

/**
 * Create mentor Stripe account
 */
export const createTestStripeAccount = async (
  userId: string,
  data?: {
    stripeAccountId?: string
    stripeAccountStatus?: 'pending' | 'active' | 'restricted' | 'inactive'
    payoutsEnabled?: boolean
    chargesEnabled?: boolean
    detailsSubmitted?: boolean
  }
) => {
  const stripeData = {
    userId,
    stripeAccountId: data?.stripeAccountId ?? `acct_test_${Date.now()}`,
    stripeAccountStatus: data?.stripeAccountStatus ?? 'pending',
    payoutsEnabled: data?.payoutsEnabled ?? false,
    chargesEnabled: data?.chargesEnabled ?? false,
    detailsSubmitted: data?.detailsSubmitted ?? false,
  }

  const [stripeAccount] = await testDb.insert(mentorStripeAccounts).values(stripeData).returning()

  if (!stripeAccount) {
    throw new Error('Failed to create Stripe account')
  }

  return stripeAccount
}

/**
 * Create a test booking
 */
export const createTestBooking = async (
  mentorEventTypeId: number,
  data?: {
    calcomBookingId?: number
    calcomUid?: string
    title?: string
    startTime?: Date
    endTime?: Date
    status?: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | 'COMPLETED' | 'NO_SHOW'
    meetingUrl?: string
  }
) => {
  const bookingData = {
    calcomBookingId: data?.calcomBookingId ?? Math.floor(Math.random() * 100000),
    calcomUid: data?.calcomUid ?? `uid_${Date.now()}`,
    title: data?.title ?? 'Test Booking',
    description: 'Test booking description',
    startTime: data?.startTime ?? new Date(Date.now() + 86400000), // Tomorrow
    endTime: data?.endTime ?? new Date(Date.now() + 90000000), // Tomorrow + 1 hour
    status: data?.status ?? 'ACCEPTED',
    meetingUrl: data?.meetingUrl ?? 'https://meet.example.com/test',
    mentorEventTypeId,
    webhookPayload: {},
  }

  const [booking] = await testDb.insert(bookings).values(bookingData).returning()

  if (!booking) {
    throw new Error('Failed to create booking')
  }

  return booking
}

/**
 * Create booking attendee
 */
export const createTestBookingAttendee = async (
  bookingId: number,
  data?: {
    userId?: string
    name?: string
    email?: string
  }
) => {
  const attendeeData = {
    bookingId,
    userId: data?.userId ?? null,
    name: data?.name ?? 'Test Attendee',
    email: data?.email ?? `attendee-${Date.now()}@example.com`,
  }

  const [attendee] = await testDb.insert(bookingAttendees).values(attendeeData).returning()

  if (!attendee) {
    throw new Error('Failed to create booking attendee')
  }

  return attendee
}

/**
 * Create booking organizer
 */
export const createTestBookingOrganizer = async (
  bookingId: number,
  userId: string,
  data?: {
    name?: string
    email?: string
    username?: string
  }
) => {
  const organizerData = {
    bookingId,
    userId,
    name: data?.name ?? 'Test Organizer',
    email: data?.email ?? `organizer-${Date.now()}@example.com`,
    username: data?.username ?? `organizer${Date.now()}`,
  }

  const [organizer] = await testDb.insert(bookingOrganizers).values(organizerData).returning()

  if (!organizer) {
    throw new Error('Failed to create booking organizer')
  }

  return organizer
}

/**
 * Create a test school
 */
export const createTestSchool = async (data?: {
  name?: string
  domainPrefix?: string
  location?: string
}) => {
  const schoolData = {
    name: data?.name ?? `Test University ${Date.now()}`,
    domainPrefix: data?.domainPrefix ?? `test${Date.now()}`,
    location: data?.location ?? 'Test City, TS',
  }

  const [school] = await testDb.insert(schools).values(schoolData).returning()

  if (!school) {
    throw new Error('Failed to create school')
  }

  return school
}

/**
 * Create a test major
 */
export const createTestMajor = async (data?: { name?: string }) => {
  const majorData = {
    name: data?.name ?? `Test Major ${Date.now()}`,
  }

  const [major] = await testDb.insert(majors).values(majorData).returning()

  if (!major) {
    throw new Error('Failed to create major')
  }

  return major
}

/**
 * Associate user with school
 */
export const associateUserWithSchool = async (userId: string, schoolId: number) => {
  const [userSchool] = await testDb
    .insert(userSchools)
    .values({ userId, schoolId })
    .returning()

  return userSchool
}

/**
 * Associate user with major
 */
export const associateUserWithMajor = async (userId: string, majorId: number) => {
  const [userMajor] = await testDb.insert(userMajors).values({ userId, majorId }).returning()

  return userMajor
}

/**
 * Clean up test data for a specific user
 */
export const cleanupTestUser = async (userId: string) => {
  await testDb.delete(bookingAttendees).where(eq(bookingAttendees.userId, userId))
  await testDb.delete(bookingOrganizers).where(eq(bookingOrganizers.userId, userId))
  await testDb.delete(mentorEventTypes).where(eq(mentorEventTypes.mentorUserId, userId))
  await testDb.delete(calcomTokens).where(eq(calcomTokens.userId, userId))
  await testDb.delete(mentorStripeAccounts).where(eq(mentorStripeAccounts.userId, userId))
  await testDb.delete(userSchools).where(eq(userSchools.userId, userId))
  await testDb.delete(userMajors).where(eq(userMajors.userId, userId))
  await testDb.delete(userProfiles).where(eq(userProfiles.userId, userId))
  await testDb.delete(users).where(eq(users.id, userId))
}
