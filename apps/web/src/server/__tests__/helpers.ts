import { eq } from 'drizzle-orm'
import { expect, vi } from 'vitest'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'

/**
 * Test helpers and custom assertions
 */

/**
 * Asserts that a user exists in the database
 */
export const assertUserExists = async (userId: string) => {
  const user = await testDb.query.user.findFirst({
    where: eq(schema.user.id, userId),
  })
  expect(user).toBeDefined()
  return user!
}

/**
 * Asserts that a user has a profile
 */
export const assertUserHasProfile = async (userId: string) => {
  const profile = await testDb.query.userProfile.findFirst({
    where: eq(schema.userProfile.userId, userId),
  })
  expect(profile).toBeDefined()
  return profile!
}

/**
 * Asserts that a user is a mentor (has Cal.com token)
 */
export const assertUserIsMentor = async (userId: string) => {
  const calcomToken = await testDb.query.calcomToken.findFirst({
    where: eq(schema.calcomToken.userId, userId),
  })
  expect(calcomToken).toBeDefined()
  return calcomToken!
}

/**
 * Asserts that a booking exists
 */
export const assertBookingExists = async (bookingId: number) => {
  const booking = await testDb.query.booking.findFirst({
    where: eq(schema.booking.id, bookingId),
  })
  expect(booking).toBeDefined()
  return booking!
}

/**
 * Asserts that a payment exists with the correct platform status
 */
export const assertPaymentStatus = async (paymentId: number, expectedStatus: string) => {
  const payment = await testDb.query.payment.findFirst({
    where: eq(schema.payment.id, paymentId),
  })
  expect(payment).toBeDefined()
  expect(payment?.platformStatus).toBe(expectedStatus)
  return payment!
}

/**
 * Asserts that a mentor has a Stripe account
 */
export const assertMentorHasStripeAccount = async (userId: string) => {
  const stripeAccount = await testDb.query.mentorStripeAccount.findFirst({
    where: eq(schema.mentorStripeAccount.userId, userId),
  })
  expect(stripeAccount).toBeDefined()
  return stripeAccount!
}

/**
 * Gets user with all relations
 */
export const getUserWithRelations = async (userId: string) => {
  const user = await testDb.query.user.findFirst({
    where: eq(schema.user.id, userId),
    with: {
      calcomTokens: true,
      stripeAccount: true,
      mentorEventTypes: true,
    },
  })
  return user
}

/**
 * Gets booking with all relations
 */
export const getBookingWithRelations = async (bookingId: number) => {
  const booking = await testDb.query.booking.findFirst({
    where: eq(schema.booking.id, bookingId),
    with: {
      attendees: true,
      organizers: true,
      payment: true,
    },
  })
  return booking
}

/**
 * Counts analytics events for a user
 */
export const countAnalyticsEvents = async (targetUserId: string, eventType?: string) => {
  const events = await testDb.query.analyticEvent.findMany({
    where: eventType
      ? eq(schema.analyticEvent.targetUserId, targetUserId)
      : eq(schema.analyticEvent.targetUserId, targetUserId),
  })

  if (eventType) {
    return events.filter(e => e.eventType === eventType).length
  }

  return events.length
}

/**
 * Gets mentor reviews with average rating
 */
export const getMentorReviews = async (mentorId: string) => {
  const reviews = await testDb.query.mentorReview.findMany({
    where: eq(schema.mentorReview.mentorId, mentorId),
  })

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return {
    reviews,
    averageRating,
    totalReviews: reviews.length,
  }
}

/**
 * Gets upcoming bookings for a user
 */
export const getUpcomingBookings = async (userId: string, isMentor = false) => {
  const now = new Date()

  if (isMentor) {
    // Get bookings where user is organizer
    const organizers = await testDb.query.bookingOrganizer.findMany({
      where: eq(schema.bookingOrganizer.userId, userId),
      with: { booking: true },
    })
    return organizers
      .map(o => o.booking)
      .filter((b): b is typeof schema.booking.$inferSelect => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return !!b && new Date(b.startTime) > now
      })
  } else {
    // Get bookings where user is attendee
    const attendees = await testDb.query.bookingAttendee.findMany({
      where: eq(schema.bookingAttendee.userId, userId),
      with: { booking: true },
    })
    return attendees
      .map(a => a.booking)
      .filter((b): b is typeof schema.booking.$inferSelect => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return !!b && new Date(b.startTime) > now
      })
  }
}

/**
 * Gets past bookings for a user
 */
export const getPastBookings = async (userId: string, isMentor = false) => {
  const now = new Date()

  if (isMentor) {
    // Get bookings where user is organizer
    const organizers = await testDb.query.bookingOrganizer.findMany({
      where: eq(schema.bookingOrganizer.userId, userId),
      with: { booking: true },
    })
    return organizers
      .map(o => o.booking)
      .filter((b): b is typeof schema.booking.$inferSelect => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return !!b && new Date(b.endTime) < now
      })
  } else {
    // Get bookings where user is attendee
    const attendees = await testDb.query.bookingAttendee.findMany({
      where: eq(schema.bookingAttendee.userId, userId),
      with: { booking: true },
    })
    return attendees
      .map(a => a.booking)
      .filter((b): b is typeof schema.booking.$inferSelect => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return !!b && new Date(b.endTime) < now
      })
  }
}

/**
 * Gets mentor's total earnings
 */
export const getMentorEarnings = async (mentorId: string) => {
  const payments = await testDb.query.payment.findMany({
    where: eq(schema.payment.mentorUserId, mentorId),
  })

  const total = payments.reduce((sum, p) => sum + p.mentorAmount, 0)
  const succeeded = payments.filter(p => p.platformStatus === 'SUCCEEDED')
  const transferred = payments.filter(p => p.transferStatus === 'transferred')

  return {
    total,
    succeededCount: succeeded.length,
    transferredCount: transferred.length,
    pendingAmount: payments
      .filter(p => p.platformStatus === 'SUCCEEDED' && p.transferStatus !== 'transferred')
      .reduce((sum, p) => sum + p.mentorAmount, 0),
  }
}

/**
 * Simulates time passage for testing time-based logic
 */
export const advanceTime = (ms: number) => {
  vi.useFakeTimers()
  vi.advanceTimersByTime(ms)
  vi.useRealTimers()
}

/**
 * Creates a date in the future
 */
export const futureDate = (daysFromNow: number) => {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
}

/**
 * Creates a date in the past
 */
export const pastDate = (daysAgo: number) => {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
}
