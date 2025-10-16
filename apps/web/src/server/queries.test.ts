import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mentorEventTypes,
  mentorStripeAccounts,
  posts,
  userProfiles,
  users,
} from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { getInfiniteScrollPosts } from './queries'

vi.mock('server-only', () => {
  return {}
})

vi.mock('next/cache', () => ({
  unstable_cacheLife: vi.fn(() => vi.fn()),
  unstable_cacheTag: vi.fn(() => vi.fn()),
  revalidateTag: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
  getAuthSession: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
  ExternalApiError: class ExternalApiError extends Error {},
}))

vi.mock('~/lib/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  InternalServerError: class InternalServerError extends Error {},
}))

// Mock the db module to use testDb
vi.mock('~/server/db', () => ({
  db: testDb,
}))

describe('Profile Activation Logic', () => {
  // Track created users for cleanup
  const createdUsers: string[] = []

  afterEach(async () => {
    // Clean up all test data after each test
    // This ensures each test starts with a clean state
    for (const userId of createdUsers) {
      await testDb.delete(posts).where(eq(posts.createdById, userId))
      await testDb.delete(mentorEventTypes).where(eq(mentorEventTypes.mentorUserId, userId))
      await testDb.delete(mentorStripeAccounts).where(eq(mentorStripeAccounts.userId, userId))
      await testDb.delete(userProfiles).where(eq(userProfiles.userId, userId))
      await testDb.delete(users).where(eq(users.id, userId))
    }
    createdUsers.length = 0 // Clear the array
  })

  describe('getMentorProfileActiveConditions', () => {
    it('should return active profile when all conditions are met (free event type)', async () => {
      // 1. Create a test user with profile image
      const userResult = await testDb
        .insert(users)
        .values({
          name: 'Test Mentor',
          email: 'mentor-free@example.com',
          image: 'https://example.com/profile.jpg',
        })
        .returning()
      const testUser = userResult[0]!
      createdUsers.push(testUser.id)

      // 2. Create complete profile with bio
      await testDb.insert(userProfiles).values({
        userId: testUser.id,
        bio: 'I am a mentor with great experience',
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create enabled event type with free pricing
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: testUser.id,
        calcomEventTypeId: 12345,
        isEnabled: true,
        customPrice: 0, // Free
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create a post
      await testDb.insert(posts).values({
        createdById: testUser.id,
      })

      // 5. Verify the profile would be active
      const profile = await testDb.query.userProfiles.findFirst({
        where: (model, { eq }) => eq(model.userId, testUser.id),
      })
      const eventType = await testDb.query.mentorEventTypes.findFirst({
        where: (model, { eq }) => eq(model.mentorUserId, testUser.id),
      })

      expect(profile?.bio).toBeTruthy()
      expect(testUser.image).toBeTruthy()
      expect(eventType?.isEnabled).toBe(true)
      expect(eventType?.customPrice).toBe(0)
    })

    it('should exclude profile without bio', async () => {
      // 1. Create a test user with profile image
      const userResult = await testDb
        .insert(users)
        .values({
          name: 'No Bio Mentor',
          email: 'no-bio@example.com',
          image: 'https://example.com/profile.jpg',
        })
        .returning()
      const testUser = userResult[0]!
      createdUsers.push(testUser.id)

      // 2. Create profile WITHOUT bio
      await testDb.insert(userProfiles).values({
        userId: testUser.id,
        bio: null, // No bio
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create enabled event type
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: testUser.id,
        calcomEventTypeId: 12345,
        isEnabled: true,
        customPrice: 0,
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create a post
      await testDb.insert(posts).values({
        createdById: testUser.id,
      })

      // 5. Fetch posts - should be empty because bio is missing
      const result = await getInfiniteScrollPosts(20)

      // 6. Verify the post is NOT included
      const userPosts = result.posts.filter(p => p.createdById === testUser.id)
      expect(userPosts).toHaveLength(0)
    })

    it('should exclude profile without image', async () => {
      // 1. Create user WITHOUT image
      const userWithoutImage = await testDb
        .insert(users)
        .values({
          name: 'No Image Mentor',
          email: 'noimage@example.com',
          image: null, // No image
        })
        .returning()

      const noImageUser = userWithoutImage[0]!
      createdUsers.push(noImageUser.id)

      // 2. Create complete profile
      await testDb.insert(userProfiles).values({
        userId: noImageUser.id,
        bio: 'I am a mentor',
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create enabled event type
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: noImageUser.id,
        calcomEventTypeId: 12346,
        isEnabled: true,
        customPrice: 0,
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create a post
      await testDb.insert(posts).values({
        createdById: noImageUser.id,
      })

      // 5. Fetch posts - should be empty because image is missing
      const result = await getInfiniteScrollPosts(20)

      // 6. Verify the post is NOT included
      const userPosts = result.posts.filter(p => p.createdById === noImageUser.id)
      expect(userPosts).toHaveLength(0)
    })

    it('should exclude profile with disabled event types', async () => {
      // 1. Create a test user with profile image
      const userResult = await testDb
        .insert(users)
        .values({
          name: 'Disabled Event Mentor',
          email: 'disabled@example.com',
          image: 'https://example.com/profile.jpg',
        })
        .returning()
      const testUser = userResult[0]!
      createdUsers.push(testUser.id)

      // 2. Create complete profile
      await testDb.insert(userProfiles).values({
        userId: testUser.id,
        bio: 'I am a mentor',
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create DISABLED event type
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: testUser.id,
        calcomEventTypeId: 12345,
        isEnabled: false, // Disabled
        customPrice: 0,
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create a post
      await testDb.insert(posts).values({
        createdById: testUser.id,
      })

      // 5. Fetch posts - should be empty because event type is disabled
      const result = await getInfiniteScrollPosts(20)

      // 6. Verify the post is NOT included
      const userPosts = result.posts.filter(p => p.createdById === testUser.id)
      expect(userPosts).toHaveLength(0)
    })

    it('should exclude profile with paid event type but no Stripe charges enabled', async () => {
      // 1. Create a test user with profile image
      const userResult = await testDb
        .insert(users)
        .values({
          name: 'Paid No Stripe Mentor',
          email: 'paid-no-stripe@example.com',
          image: 'https://example.com/profile.jpg',
        })
        .returning()
      const testUser = userResult[0]!
      createdUsers.push(testUser.id)

      // 2. Create complete profile
      await testDb.insert(userProfiles).values({
        userId: testUser.id,
        bio: 'I am a mentor',
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create enabled event type with PAID pricing
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: testUser.id,
        calcomEventTypeId: 12345,
        isEnabled: true,
        customPrice: 5000, // $50.00
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create Stripe account WITHOUT charges enabled
      await testDb.insert(mentorStripeAccounts).values({
        userId: testUser.id,
        stripeAccountId: 'acct_test123',
        stripeAccountStatus: 'pending',
        chargesEnabled: false, // Charges NOT enabled
        payoutsEnabled: false,
        detailsSubmitted: false,
      })

      // 5. Create a post
      await testDb.insert(posts).values({
        createdById: testUser.id,
      })

      // 6. Fetch posts - should be empty because paid event requires Stripe
      const result = await getInfiniteScrollPosts(20)

      // 7. Verify the post is NOT included
      const userPosts = result.posts.filter(p => p.createdById === testUser.id)
      expect(userPosts).toHaveLength(0)
    })

    it('should include profile with paid event type when Stripe charges are enabled', async () => {
      // 1. Create a test user with profile image
      const userResult = await testDb
        .insert(users)
        .values({
          name: 'Paid With Stripe Mentor',
          email: 'paid-with-stripe@example.com',
          image: 'https://example.com/profile.jpg',
        })
        .returning()
      const testUser = userResult[0]!
      createdUsers.push(testUser.id)

      // 2. Create complete profile
      await testDb.insert(userProfiles).values({
        userId: testUser.id,
        bio: 'I am a mentor with paid sessions',
        schoolYear: 'Senior',
        graduationYear: 2025,
        rankingScore: 0,
      })

      // 3. Create enabled event type with PAID pricing
      await testDb.insert(mentorEventTypes).values({
        mentorUserId: testUser.id,
        calcomEventTypeId: 12345,
        isEnabled: true,
        customPrice: 5000, // $50.00
        title: '30 Min Meeting',
        duration: 30,
      })

      // 4. Create Stripe account WITH charges enabled
      await testDb.insert(mentorStripeAccounts).values({
        userId: testUser.id,
        stripeAccountId: 'acct_test123',
        stripeAccountStatus: 'active',
        chargesEnabled: true, // Charges enabled
        payoutsEnabled: true,
        detailsSubmitted: true,
      })

      // 5. Create a post
      await testDb.insert(posts).values({
        createdById: testUser.id,
      })

      // 6. Fetch posts - should include this post
      const result = await getInfiniteScrollPosts(20)

      // 7. Verify the post IS included
      const userPosts = result.posts.filter(p => p.createdById === testUser.id)
      expect(userPosts).toHaveLength(1)
      expect(userPosts[0]?.description).toBe('I am a mentor with paid sessions')
    })
  })
})
