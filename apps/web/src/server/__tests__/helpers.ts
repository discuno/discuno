import { expect } from 'vitest'
import type * as schema from '~/server/db/schema'

/**
 * Test helper utilities for common assertions and operations.
 */

/**
 * Asserts that a user has expected properties.
 */
export const assertUser = (
  user: typeof schema.user.$inferSelect,
  expected: {
    email?: string
    name?: string
    emailVerified?: boolean
  }
) => {
  if (expected.email !== undefined) {
    expect(user.email).toBe(expected.email)
  }
  if (expected.name !== undefined) {
    expect(user.name).toBe(expected.name)
  }
  if (expected.emailVerified !== undefined) {
    expect(user.emailVerified).toBe(expected.emailVerified)
  }
}

/**
 * Asserts that a profile has expected properties.
 */
export const assertProfile = (
  profile: typeof schema.userProfile.$inferSelect,
  expected: {
    bio?: string | null
    schoolYear?: string | null
    graduationYear?: number | null
    isMentor?: boolean
    rankingScore?: number
    viewCount?: number
  }
) => {
  if (expected.bio !== undefined) {
    expect(profile.bio).toBe(expected.bio)
  }
  if (expected.schoolYear !== undefined) {
    expect(profile.schoolYear).toBe(expected.schoolYear)
  }
  if (expected.graduationYear !== undefined) {
    expect(profile.graduationYear).toBe(expected.graduationYear)
  }
  if (expected.isMentor !== undefined) {
    expect(profile.isMentor).toBe(expected.isMentor)
  }
  if (expected.rankingScore !== undefined) {
    expect(profile.rankingScore).toBeCloseTo(expected.rankingScore, 2)
  }
  if (expected.viewCount !== undefined) {
    expect(profile.viewCount).toBe(expected.viewCount)
  }
}

/**
 * Asserts that a booking has expected properties.
 */
export const assertBooking = (
  booking: typeof schema.booking.$inferSelect,
  expected: {
    status?: string
    title?: string
    calcomBookingId?: number
  }
) => {
  if (expected.status !== undefined) {
    expect(booking.status).toBe(expected.status)
  }
  if (expected.title !== undefined) {
    expect(booking.title).toBe(expected.title)
  }
  if (expected.calcomBookingId !== undefined) {
    expect(booking.calcomBookingId).toBe(expected.calcomBookingId)
  }
}

/**
 * Asserts that a payment has expected properties.
 */
export const assertPayment = (
  payment: typeof schema.payment.$inferSelect,
  expected: {
    amount?: number
    status?: string
    platformFeeAmount?: number
    mentorAmount?: number
    transferStatus?: string | null
  }
) => {
  if (expected.amount !== undefined) {
    expect(payment.amount).toBe(expected.amount)
  }
  if (expected.status !== undefined) {
    expect(payment.status).toBe(expected.status)
  }
  if (expected.platformFeeAmount !== undefined) {
    expect(payment.platformFeeAmount).toBe(expected.platformFeeAmount)
  }
  if (expected.mentorAmount !== undefined) {
    expect(payment.mentorAmount).toBe(expected.mentorAmount)
  }
  if (expected.transferStatus !== undefined) {
    expect(payment.transferStatus).toBe(expected.transferStatus)
  }
}

/**
 * Waits for a condition to be true (useful for async operations).
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const timeout = options.timeout ?? 5000
  const interval = options.interval ?? 100
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Mocks Date.now() for testing time-dependent logic.
 */
export const mockDateNow = (timestamp: number) => {
  const originalDateNow = Date.now
  Date.now = () => timestamp
  return () => {
    Date.now = originalDateNow
  }
}

/**
 * Creates a future date (useful for bookings, etc.).
 */
export const futureDate = (daysFromNow: number): Date => {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
}

/**
 * Creates a past date.
 */
export const pastDate = (daysAgo: number): Date => {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
}

/**
 * Formats a date to ISO string without milliseconds.
 */
export const formatDateForDb = (date: Date): string => {
  return date.toISOString().split('.')[0] + 'Z'
}

/**
 * Checks if two dates are approximately equal (within 1 second).
 */
export const datesAreClose = (date1: Date, date2: Date, toleranceMs = 1000): boolean => {
  return Math.abs(date1.getTime() - date2.getTime()) < toleranceMs
}

/**
 * Assert that a date is recent (within the last few seconds).
 */
export const assertRecentDate = (date: Date | null, toleranceSeconds = 5) => {
  expect(date).toBeTruthy()
  if (date) {
    const now = Date.now()
    const diff = now - date.getTime()
    expect(diff).toBeLessThan(toleranceSeconds * 1000)
    expect(diff).toBeGreaterThanOrEqual(0)
  }
}

/**
 * Calculates platform fee based on amount (10% platform fee).
 */
export const calculatePlatformFee = (amount: number): number => {
  return Math.floor(amount * 0.1)
}

/**
 * Calculates mentor amount after platform fee.
 */
export const calculateMentorAmount = (amount: number): number => {
  return amount - calculatePlatformFee(amount)
}

/**
 * Validates email format.
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validates .edu email format.
 */
export const isValidEduEmail = (email: string): boolean => {
  return isValidEmail(email) && email.toLowerCase().endsWith('.edu')
}
