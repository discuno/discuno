import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import * as schema from '~/server/db/schema'
import {
  createTestEventType,
  createTestMentor,
  createTestReview,
  createTestUser,
  resetCounters,
} from '../fixtures'
import { assertRecentDate, futureDate } from '../helpers'

describe('Mentor Workflows Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Mentor Setup', () => {
    it('should create a mentor with Cal.com token', async () => {
      const mentor = await createTestMentor({
        email: 'mentor@test.edu',
        name: 'Test Mentor',
        withCalcomToken: true,
      })

      expect(mentor.profile.isMentor).toBe(true)

      const token = await testDb.query.calcomToken.findFirst({
        where: eq(schema.calcomToken.userId, mentor.id),
      })

      expect(token).toBeTruthy()
      expect(token?.accessToken).toContain('test_calcom_token')
      expect(token?.refreshToken).toContain('test_calcom_refresh')
      assertRecentDate(token?.createdAt ?? null)
    })

    it('should create a mentor with Stripe Connect account', async () => {
      const mentor = await createTestMentor({
        withStripeAccount: true,
      })

      const stripeAccount = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, mentor.id),
      })

      expect(stripeAccount).toBeTruthy()
      expect(stripeAccount?.stripeAccountId).toContain('acct_test')
      expect(stripeAccount?.detailsSubmitted).toBe(true)
      expect(stripeAccount?.chargesEnabled).toBe(true)
      expect(stripeAccount?.payoutsEnabled).toBe(true)
    })

    it('should create a fully onboarded mentor', async () => {
      const mentor = await createTestMentor({
        withCalcomToken: true,
        withStripeAccount: true,
      })

      // Verify mentor has both integrations
      const token = await testDb.query.calcomToken.findFirst({
        where: eq(schema.calcomToken.userId, mentor.id),
      })

      const stripeAccount = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, mentor.id),
      })

      expect(token).toBeTruthy()
      expect(stripeAccount).toBeTruthy()
      expect(mentor.profile.isMentor).toBe(true)
    })
  })

  describe('Cal.com Token Management', () => {
    it('should store Cal.com OAuth tokens', async () => {
      const mentor = await createTestMentor()

      const expiresAt = futureDate(1)
      await testDb.insert(schema.calcomToken).values({
        userId: mentor.id,
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresAt,
        tokenType: 'Bearer',
      })

      const token = await testDb.query.calcomToken.findFirst({
        where: eq(schema.calcomToken.userId, mentor.id),
      })

      expect(token?.accessToken).toBe('access_token_123')
      expect(token?.refreshToken).toBe('refresh_token_456')
      expect(token?.tokenType).toBe('Bearer')
      expect(token?.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -3)
    })

    it('should update expired tokens', async () => {
      const mentor = await createTestMentor({ withCalcomToken: true })

      const newExpiresAt = futureDate(2)
      await testDb
        .update(schema.calcomToken)
        .set({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
          expiresAt: newExpiresAt,
        })
        .where(eq(schema.calcomToken.userId, mentor.id))

      const token = await testDb.query.calcomToken.findFirst({
        where: eq(schema.calcomToken.userId, mentor.id),
      })

      expect(token?.accessToken).toBe('new_access_token')
      expect(token?.refreshToken).toBe('new_refresh_token')
    })

    it('should handle multiple mentors with separate tokens', async () => {
      const mentor1 = await createTestMentor({ withCalcomToken: true })
      const mentor2 = await createTestMentor({ withCalcomToken: true })

      const tokens = await testDb.query.calcomToken.findMany()

      expect(tokens).toHaveLength(2)
      const mentorIds = tokens.map(t => t.userId)
      expect(mentorIds).toContain(mentor1.id)
      expect(mentorIds).toContain(mentor2.id)
    })
  })

  describe('Event Type Management', () => {
    it('should create an event type for a mentor', async () => {
      const mentor = await createTestMentor()

      const eventType = await createTestEventType(mentor.id, {
        title: '30 Min Consultation',
        slug: '30-min-consultation',
        length: 30,
        price: 5000, // $50.00
        currency: 'USD',
      })

      expect(eventType.userId).toBe(mentor.id)
      expect(eventType.title).toBe('30 Min Consultation')
      expect(eventType.slug).toBe('30-min-consultation')
      expect(eventType.length).toBe(30)
      expect(eventType.price).toBe(5000)
      expect(eventType.currency).toBe('USD')
    })

    it('should create multiple event types for a mentor', async () => {
      const mentor = await createTestMentor()

      await createTestEventType(mentor.id, {
        title: '15 Min Quick Chat',
        length: 15,
        price: 2500,
      })

      await createTestEventType(mentor.id, {
        title: '60 Min Deep Dive',
        length: 60,
        price: 10000,
      })

      const eventTypes = await testDb.query.mentorEventType.findMany({
        where: eq(schema.mentorEventType.userId, mentor.id),
      })

      expect(eventTypes).toHaveLength(2)
      expect(eventTypes.map(et => et.title)).toContain('15 Min Quick Chat')
      expect(eventTypes.map(et => et.title)).toContain('60 Min Deep Dive')
    })

    it('should update event type pricing', async () => {
      const mentor = await createTestMentor()
      const eventType = await createTestEventType(mentor.id, {
        price: 5000,
      })

      await testDb
        .update(schema.mentorEventType)
        .set({ price: 7500 })
        .where(eq(schema.mentorEventType.id, eventType.id))

      const updated = await testDb.query.mentorEventType.findFirst({
        where: eq(schema.mentorEventType.id, eventType.id),
      })

      expect(updated?.price).toBe(7500)
    })

    it('should query mentors with their event types', async () => {
      const mentor = await createTestMentor()
      await createTestEventType(mentor.id, { title: 'Event 1' })
      await createTestEventType(mentor.id, { title: 'Event 2' })

      const mentorWithEvents = await testDb.query.user.findFirst({
        where: eq(schema.user.id, mentor.id),
        with: {
          eventTypes: true,
        },
      })

      expect(mentorWithEvents?.eventTypes).toHaveLength(2)
    })
  })

  describe('Stripe Account Management', () => {
    it('should track Stripe Connect onboarding status', async () => {
      const mentor = await createTestMentor()

      // Initial incomplete onboarding
      await testDb.insert(schema.mentorStripeAccount).values({
        userId: mentor.id,
        stripeAccountId: 'acct_incomplete',
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      })

      let account = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, mentor.id),
      })

      expect(account?.detailsSubmitted).toBe(false)
      expect(account?.chargesEnabled).toBe(false)
      expect(account?.payoutsEnabled).toBe(false)

      // Update to completed onboarding
      await testDb
        .update(schema.mentorStripeAccount)
        .set({
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: true,
        })
        .where(eq(schema.mentorStripeAccount.userId, mentor.id))

      account = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, mentor.id),
      })

      expect(account?.detailsSubmitted).toBe(true)
      expect(account?.chargesEnabled).toBe(true)
      expect(account?.payoutsEnabled).toBe(true)
    })

    it('should store Stripe account metadata', async () => {
      const mentor = await createTestMentor()

      await testDb.insert(schema.mentorStripeAccount).values({
        userId: mentor.id,
        stripeAccountId: 'acct_test_123',
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        metadata: {
          country: 'US',
          businessType: 'individual',
        },
      })

      const account = await testDb.query.mentorStripeAccount.findFirst({
        where: eq(schema.mentorStripeAccount.userId, mentor.id),
      })

      expect(account?.metadata).toEqual({
        country: 'US',
        businessType: 'individual',
      })
    })
  })

  describe('Mentor Reviews', () => {
    it('should create a review for a mentor', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const review = await createTestReview(mentor.id, student.id, {
        rating: 5,
        comment: 'Excellent mentor! Very helpful.',
      })

      expect(review.mentorId).toBe(mentor.id)
      expect(review.reviewerId).toBe(student.id)
      expect(review.rating).toBe(5)
      expect(review.comment).toBe('Excellent mentor! Very helpful.')
      assertRecentDate(review.createdAt)
    })

    it('should calculate average rating for a mentor', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()
      const student3 = await createTestUser()

      await createTestReview(mentor.id, student1.id, { rating: 5 })
      await createTestReview(mentor.id, student2.id, { rating: 4 })
      await createTestReview(mentor.id, student3.id, { rating: 5 })

      const reviews = await testDb.query.mentorReview.findMany({
        where: eq(schema.mentorReview.mentorId, mentor.id),
      })

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

      expect(avgRating).toBeCloseTo(4.67, 2)
      expect(reviews).toHaveLength(3)
    })

    it('should allow a student to review multiple mentors', async () => {
      const mentor1 = await createTestMentor()
      const mentor2 = await createTestMentor()
      const student = await createTestUser()

      await createTestReview(mentor1.id, student.id, { rating: 5 })
      await createTestReview(mentor2.id, student.id, { rating: 4 })

      const reviews = await testDb.query.mentorReview.findMany({
        where: eq(schema.mentorReview.reviewerId, student.id),
      })

      expect(reviews).toHaveLength(2)
    })

    it('should query mentor with all their reviews', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()

      await createTestReview(mentor.id, student1.id, { rating: 5 })
      await createTestReview(mentor.id, student2.id, { rating: 4 })

      const mentorWithReviews = await testDb.query.user.findFirst({
        where: eq(schema.user.id, mentor.id),
        with: {
          receivedReviews: {
            with: {
              reviewer: true,
            },
          },
        },
      })

      expect(mentorWithReviews?.receivedReviews).toHaveLength(2)
      expect(mentorWithReviews?.receivedReviews[0]?.reviewer).toBeTruthy()
    })

    it('should support reviews without comments', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const review = await createTestReview(mentor.id, student.id, {
        rating: 4,
        comment: null,
      })

      expect(review.rating).toBe(4)
      expect(review.comment).toBeNull()
    })

    it('should sort reviews by most recent', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()

      // Create reviews with slight delay to ensure different timestamps
      const review1 = await createTestReview(mentor.id, student1.id, { rating: 5 })
      await new Promise(resolve => setTimeout(resolve, 10))
      const review2 = await createTestReview(mentor.id, student2.id, { rating: 4 })

      const reviews = await testDb.query.mentorReview.findMany({
        where: eq(schema.mentorReview.mentorId, mentor.id),
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
      })

      expect(reviews[0]?.id).toBe(review2.id)
      expect(reviews[1]?.id).toBe(review1.id)
    })
  })

  describe('Mentor Discovery', () => {
    it('should find mentors with complete onboarding', async () => {
      await createTestMentor({
        withCalcomToken: true,
        withStripeAccount: true,
      })

      await createTestMentor({
        withCalcomToken: false,
        withStripeAccount: false,
      })

      // Find mentors with both Cal.com and Stripe setup
      const fullyOnboarded = await testDb.query.user.findMany({
        where: eq(schema.userProfile.isMentor, true),
        with: {
          profile: true,
          calcomToken: true,
          stripeAccount: true,
        },
      })

      const completelySetup = fullyOnboarded.filter(
        m => m.calcomToken && m.stripeAccount?.chargesEnabled
      )

      expect(completelySetup).toHaveLength(1)
    })

    it('should filter mentors by availability (has event types)', async () => {
      const mentor1 = await createTestMentor()
      const mentor2 = await createTestMentor()

      await createTestEventType(mentor1.id)

      const mentorsWithAvailability = await testDb.query.user.findMany({
        with: {
          eventTypes: true,
        },
      })

      const available = mentorsWithAvailability.filter(m => m.eventTypes.length > 0)

      expect(available).toHaveLength(1)
      expect(available[0]?.id).toBe(mentor1.id)
    })
  })
})
