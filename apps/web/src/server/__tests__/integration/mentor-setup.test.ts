import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import {
  createCompleteUser,
  createCompleteMentor,
  createTestCalcomToken,
  createTestMentorEventType,
  createTestReview,
  createTestStripeAccount,
  createTestUser,
} from '../factories'
import { assertMentorHasStripeAccount, assertUserIsMentor, getMentorReviews } from '../helpers'

vi.mock('server-only', () => ({}))

describe('Mentor Setup and Management Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Mentor Cal.com Token Creation', () => {
    it('should create a Cal.com token for a mentor', async () => {
      const user = await createTestUser()
      const calcomToken = await createTestCalcomToken(user.id, {
        calcomUserId: 12345,
        calcomUsername: 'mentor_user',
      })

      expect(calcomToken.userId).toBe(user.id)
      expect(calcomToken.calcomUserId).toBe(12345)
      expect(calcomToken.calcomUsername).toBe('mentor_user')
      expect(calcomToken.accessToken).toBeDefined()
      expect(calcomToken.refreshToken).toBeDefined()
      expect(calcomToken.accessTokenExpiresAt).toBeInstanceOf(Date)

      await assertUserIsMentor(user.id)
    })

    it('should enforce unique userId constraint on Cal.com tokens', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id)

      // Creating another token for the same user should fail
      await expect(createTestCalcomToken(user.id)).rejects.toThrow()
    })

    it('should handle token expiration dates correctly', async () => {
      const user = await createTestUser()
      const now = new Date()
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const calcomToken = await createTestCalcomToken(user.id, {
        accessTokenExpiresAt: oneHourLater,
        refreshTokenExpiresAt: thirtyDaysLater,
      })

      expect(calcomToken.accessTokenExpiresAt.getTime()).toBe(oneHourLater.getTime())
      expect(calcomToken.refreshTokenExpiresAt.getTime()).toBe(thirtyDaysLater.getTime())
    })

    it('should cascade delete Cal.com token when user is deleted', async () => {
      const user = await createTestUser()
      const token = await createTestCalcomToken(user.id)

      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      const deletedToken = await testDb.query.calcomToken.findFirst({
        where: eq(schema.calcomToken.id, token.id),
      })

      expect(deletedToken).toBeUndefined()
    })
  })

  describe('Mentor Event Type Management', () => {
    it('should create a mentor event type', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id) // Mentor must have Cal.com token

      const eventType = await createTestMentorEventType(user.id, {
        title: '30-min Career Consultation',
        description: 'Get career advice from an experienced professional',
        duration: 30,
        customPrice: 5000, // $50
        isEnabled: true,
      })

      expect(eventType.mentorUserId).toBe(user.id)
      expect(eventType.title).toBe('30-min Career Consultation')
      expect(eventType.duration).toBe(30)
      expect(eventType.customPrice).toBe(5000)
      expect(eventType.isEnabled).toBe(true)
    })

    it('should allow a mentor to have multiple event types', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id)

      await createTestMentorEventType(user.id, {
        title: '15-min Quick Chat',
        duration: 15,
        customPrice: 2000,
      })

      await createTestMentorEventType(user.id, {
        title: '60-min Deep Dive',
        duration: 60,
        customPrice: 10000,
      })

      const eventTypes = await testDb.query.mentorEventType.findMany({
        where: eq(schema.mentorEventType.mentorUserId, user.id),
      })

      expect(eventTypes).toHaveLength(2)
      expect(eventTypes[0]?.duration).toBe(15)
      expect(eventTypes[1]?.duration).toBe(60)
    })

    it('should default isEnabled to false for new event types', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id)

      const eventType = await createTestMentorEventType(user.id, {
        title: 'Test Event',
        duration: 30,
      })

      expect(eventType.isEnabled).toBe(false)
    })

    it('should enforce unique calcomEventTypeId constraint', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id)

      const calcomEventTypeId = 99999
      await createTestMentorEventType(user.id, { calcomEventTypeId })

      // Creating another event type with same Cal.com ID should fail
      const user2 = await createTestUser()
      await createTestCalcomToken(user2.id)
      await expect(createTestMentorEventType(user2.id, { calcomEventTypeId })).rejects.toThrow()
    })

    it('should cascade delete event types when mentor is deleted', async () => {
      const user = await createTestUser()
      await createTestCalcomToken(user.id)
      const eventType = await createTestMentorEventType(user.id)

      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      const deletedEventType = await testDb.query.mentorEventType.findFirst({
        where: eq(schema.mentorEventType.id, eventType.id),
      })

      expect(deletedEventType).toBeUndefined()
    })
  })

  describe('Mentor Stripe Account Setup', () => {
    it('should create a Stripe account for a mentor', async () => {
      const user = await createTestUser()
      const stripeAccount = await createTestStripeAccount(user.id, {
        stripeAccountId: 'acct_test_123',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      })

      expect(stripeAccount.userId).toBe(user.id)
      expect(stripeAccount.stripeAccountId).toBe('acct_test_123')
      expect(stripeAccount.chargesEnabled).toBe(true)
      expect(stripeAccount.payoutsEnabled).toBe(true)
      expect(stripeAccount.detailsSubmitted).toBe(true)

      await assertMentorHasStripeAccount(user.id)
    })

    it('should enforce unique userId constraint on Stripe accounts', async () => {
      const user = await createTestUser()
      await createTestStripeAccount(user.id)

      // Creating another Stripe account for the same user should fail
      await expect(createTestStripeAccount(user.id)).rejects.toThrow()
    })

    it('should handle onboarding state for new accounts', async () => {
      const user = await createTestUser()
      const stripeAccount = await createTestStripeAccount(user.id, {
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })

      expect(stripeAccount.chargesEnabled).toBe(false)
      expect(stripeAccount.payoutsEnabled).toBe(false)
      expect(stripeAccount.detailsSubmitted).toBe(false)

      // Simulate completing onboarding
      await testDb
        .update(schema.mentorStripeAccount)
        .set({
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        })
        .where(eq(schema.mentorStripeAccount.userId, user.id))

      const updated = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, user.id),
      })

      expect(updated?.chargesEnabled).toBe(true)
      expect(updated?.payoutsEnabled).toBe(true)
      expect(updated?.detailsSubmitted).toBe(true)
    })

    it('should cascade delete Stripe account when mentor is deleted', async () => {
      const user = await createTestUser()
      const account = await createTestStripeAccount(user.id)

      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      const deletedAccount = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.id, account.id),
      })

      expect(deletedAccount).toBeUndefined()
    })
  })

  describe('Complete Mentor Setup', () => {
    it('should create a complete mentor with all required components', async () => {
      const mentor = await createCompleteMentor({
        user: { name: 'Expert Mentor', email: 'mentor@example.com' },
        profile: { schoolYear: 'Graduate', graduationYear: 2025 },
        school: { name: 'Harvard', domainPrefix: 'harvard' },
        major: { name: 'Business Administration' },
        calcomToken: { calcomUsername: 'expert_mentor' },
        eventType: {
          title: 'Business Consultation',
          duration: 45,
          customPrice: 7500,
          isEnabled: true,
        },
      })

      expect(mentor.user.id).toBeDefined()
      expect(mentor.calcomToken.userId).toBe(mentor.user.id)
      expect(mentor.eventType.mentorUserId).toBe(mentor.user.id)
      expect(mentor.profile.userId).toBe(mentor.user.id)

      // Verify mentor is fully set up
      await assertUserIsMentor(mentor.user.id)
    })
  })

  describe('Mentor Reviews', () => {
    it('should allow users to leave reviews for mentors', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const review = await createTestReview(
        mentor.user.id,
        student.id,
        5,
        'Excellent mentor! Very helpful and knowledgeable.'
      )

      expect(review.mentorId).toBe(mentor.user.id)
      expect(review.userId).toBe(student.id)
      expect(review.rating).toBe(5)
      expect(review.review).toBe('Excellent mentor! Very helpful and knowledgeable.')
    })

    it('should enforce rating constraints (1-5)', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      // Rating below 1 should fail
      await expect(createTestReview(mentor.user.id, student.id, 0)).rejects.toThrow()

      // Rating above 5 should fail
      await expect(createTestReview(mentor.user.id, student.id, 6)).rejects.toThrow()

      // Valid ratings should succeed
      const review = await createTestReview(mentor.user.id, student.id, 4)
      expect(review.rating).toBe(4)
    })

    it('should calculate average rating correctly', async () => {
      const mentor = await createCompleteMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()
      const student3 = await createTestUser()

      await createTestReview(mentor.user.id, student1.id, 5)
      await createTestReview(mentor.user.id, student2.id, 4)
      await createTestReview(mentor.user.id, student3.id, 3)

      const { averageRating, totalReviews } = await getMentorReviews(mentor.user.id)

      expect(totalReviews).toBe(3)
      expect(averageRating).toBe(4) // (5 + 4 + 3) / 3 = 4
    })

    it('should handle mentor with no reviews', async () => {
      const mentor = await createCompleteMentor()

      const { averageRating, totalReviews, reviews } = await getMentorReviews(mentor.user.id)

      expect(totalReviews).toBe(0)
      expect(averageRating).toBe(0)
      expect(reviews).toHaveLength(0)
    })

    it('should cascade delete reviews when mentor is deleted', async () => {
      const mentor = await createCompleteMentor()
      const student = await createTestUser()
      const review = await createTestReview(mentor.user.id, student.id, 5)

      await testDb.delete(schema.user).where(eq(schema.user.id, mentor.user.id))

      const deletedReview = await testDb.query.mentorReview.findFirst({
        where: eq(schema.mentorReview.id, review.id),
      })

      expect(deletedReview).toBeUndefined()
    })
  })
})
