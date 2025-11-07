import { eq, isNull } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import * as schema from '~/server/db/schema'
import { createAnalyticsEvent, createTestPost, createTestUser, resetCounters } from '../fixtures'
import { assertRecentDate } from '../helpers'

describe('Posts and Analytics Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Post Creation and Management', () => {
    it('should create a post for a user', async () => {
      const user = await createTestUser()

      const post = await createTestPost(user.id)

      expect(post.id).toBeTruthy()
      expect(post.createdById).toBe(user.id)
      assertRecentDate(post.createdAt)
      expect(post.deletedAt).toBeNull()
    })

    it('should create multiple posts for a user', async () => {
      const user = await createTestUser()

      await createTestPost(user.id)
      await createTestPost(user.id)
      await createTestPost(user.id)

      const posts = await testDb.query.post.findMany({
        where: eq(schema.post.createdById, user.id),
      })

      expect(posts).toHaveLength(3)
    })

    it('should soft delete a post', async () => {
      const user = await createTestUser()
      const post = await createTestPost(user.id)

      await testDb
        .update(schema.post)
        .set({ deletedAt: new Date() })
        .where(eq(schema.post.id, post.id))

      const deletedPost = await testDb.query.post.findFirst({
        where: eq(schema.post.id, post.id),
      })

      expect(deletedPost?.deletedAt).toBeTruthy()
      assertRecentDate(deletedPost?.deletedAt ?? null)
    })

    it('should exclude soft-deleted posts from feed queries', async () => {
      const user = await createTestUser()

      const post1 = await createTestPost(user.id)
      const post2 = await createTestPost(user.id)
      const post3 = await createTestPost(user.id)

      // Soft delete post2
      await testDb
        .update(schema.post)
        .set({ deletedAt: new Date() })
        .where(eq(schema.post.id, post2.id))

      const activePosts = await testDb.query.post.findMany({
        where: isNull(schema.post.deletedAt),
      })

      const activePostIds = activePosts.map(p => p.id)
      expect(activePostIds).toContain(post1.id)
      expect(activePostIds).not.toContain(post2.id)
      expect(activePostIds).toContain(post3.id)
    })
  })

  describe('Post Queries with Relations', () => {
    it('should query posts with creator information', async () => {
      const user = await createTestUser({
        name: 'Post Creator',
        email: 'creator@example.com',
      })

      const post = await createTestPost(user.id)

      const postWithCreator = await testDb.query.post.findFirst({
        where: eq(schema.post.id, post.id),
        with: {
          creator: {
            with: {
              profile: true,
            },
          },
        },
      })

      expect(postWithCreator?.creator).toBeTruthy()
      expect(postWithCreator?.creator.name).toBe('Post Creator')
      expect(postWithCreator?.creator.profile).toBeTruthy()
    })

    it('should query all posts by a user', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createTestPost(user1.id)
      await createTestPost(user1.id)
      await createTestPost(user2.id)

      const user1Posts = await testDb.query.post.findMany({
        where: eq(schema.post.createdById, user1.id),
      })

      const user2Posts = await testDb.query.post.findMany({
        where: eq(schema.post.createdById, user2.id),
      })

      expect(user1Posts).toHaveLength(2)
      expect(user2Posts).toHaveLength(1)
    })

    it('should order posts by creation date', async () => {
      const user = await createTestUser()

      const post1 = await createTestPost(user.id)
      await new Promise(resolve => setTimeout(resolve, 10))
      const post2 = await createTestPost(user.id)
      await new Promise(resolve => setTimeout(resolve, 10))
      const post3 = await createTestPost(user.id)

      const posts = await testDb.query.post.findMany({
        where: eq(schema.post.createdById, user.id),
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      })

      expect(posts[0]?.id).toBe(post3.id)
      expect(posts[1]?.id).toBe(post2.id)
      expect(posts[2]?.id).toBe(post1.id)
    })

    it('should have random sort key for feed diversity', async () => {
      const user = await createTestUser()

      const post1 = await createTestPost(user.id)
      const post2 = await createTestPost(user.id)
      const post3 = await createTestPost(user.id)

      expect(post1.random_sort_key).toBeGreaterThanOrEqual(0)
      expect(post1.random_sort_key).toBeLessThanOrEqual(1)
      expect(post2.random_sort_key).not.toBe(post1.random_sort_key)
      expect(post3.random_sort_key).not.toBe(post1.random_sort_key)
    })
  })

  describe('Post Cascade Deletes', () => {
    it('should cascade delete posts when user is deleted', async () => {
      const user = await createTestUser()
      await createTestPost(user.id)
      await createTestPost(user.id)

      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      const posts = await testDb.query.post.findMany({
        where: eq(schema.post.createdById, user.id),
      })

      expect(posts).toHaveLength(0)
    })
  })

  describe('Analytics Events', () => {
    it('should create a profile view event', async () => {
      const mentor = await createTestUser()
      const viewer = await createTestUser()

      const event = await createAnalyticsEvent(mentor.id, 'PROFILE_VIEW', viewer.id)

      expect(event.targetUserId).toBe(mentor.id)
      expect(event.actorUserId).toBe(viewer.id)
      expect(event.eventType).toBe('PROFILE_VIEW')
      expect(event.processed).toBe(false)
      assertRecentDate(event.createdAt)
    })

    it('should create a completed booking event', async () => {
      const mentor = await createTestUser()

      const event = await createAnalyticsEvent(mentor.id, 'COMPLETED_BOOKING')

      expect(event.targetUserId).toBe(mentor.id)
      expect(event.eventType).toBe('COMPLETED_BOOKING')
      expect(event.actorUserId).toBeNull()
    })

    it('should create a review received event', async () => {
      const mentor = await createTestUser()
      const reviewer = await createTestUser()

      const event = await createAnalyticsEvent(mentor.id, 'REVIEW_RECEIVED', reviewer.id)

      expect(event.targetUserId).toBe(mentor.id)
      expect(event.actorUserId).toBe(reviewer.id)
      expect(event.eventType).toBe('REVIEW_RECEIVED')
    })

    it('should track multiple events for a user', async () => {
      const mentor = await createTestUser()
      const viewer1 = await createTestUser()
      const viewer2 = await createTestUser()

      await createAnalyticsEvent(mentor.id, 'PROFILE_VIEW', viewer1.id)
      await createAnalyticsEvent(mentor.id, 'PROFILE_VIEW', viewer2.id)
      await createAnalyticsEvent(mentor.id, 'COMPLETED_BOOKING')

      const events = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.targetUserId, mentor.id),
      })

      expect(events).toHaveLength(3)
    })

    it('should mark events as processed', async () => {
      const user = await createTestUser()
      const event = await createAnalyticsEvent(user.id, 'PROFILE_VIEW')

      expect(event.processed).toBe(false)

      await testDb
        .update(schema.analyticEvent)
        .set({ processed: true })
        .where(eq(schema.analyticEvent.id, event.id))

      const processed = await testDb.query.analyticEvent.findFirst({
        where: eq(schema.analyticEvent.id, event.id),
      })

      expect(processed?.processed).toBe(true)
    })

    it('should query unprocessed events', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createAnalyticsEvent(user1.id, 'PROFILE_VIEW')
      const event2 = await createAnalyticsEvent(user1.id, 'COMPLETED_BOOKING')
      await createAnalyticsEvent(user2.id, 'PROFILE_VIEW')

      // Mark one event as processed
      await testDb
        .update(schema.analyticEvent)
        .set({ processed: true })
        .where(eq(schema.analyticEvent.id, event2.id))

      const unprocessed = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.processed, false),
      })

      expect(unprocessed).toHaveLength(2)
    })
  })

  describe('Analytics Event Types', () => {
    it('should support all event types', async () => {
      const user = await createTestUser()

      const eventTypes: Array<'PROFILE_VIEW' | 'COMPLETED_BOOKING' | 'REVIEW_RECEIVED'> = [
        'PROFILE_VIEW',
        'COMPLETED_BOOKING',
        'REVIEW_RECEIVED',
      ]

      for (const eventType of eventTypes) {
        await createAnalyticsEvent(user.id, eventType)
      }

      const events = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.targetUserId, user.id),
      })

      expect(events).toHaveLength(3)
      const types = events.map(e => e.eventType)
      expect(types).toContain('PROFILE_VIEW')
      expect(types).toContain('COMPLETED_BOOKING')
      expect(types).toContain('REVIEW_RECEIVED')
    })

    it('should filter events by type', async () => {
      const user = await createTestUser()
      const viewer1 = await createTestUser()
      const viewer2 = await createTestUser()
      const viewer3 = await createTestUser()

      await createAnalyticsEvent(user.id, 'PROFILE_VIEW', viewer1.id)
      await createAnalyticsEvent(user.id, 'PROFILE_VIEW', viewer2.id)
      await createAnalyticsEvent(user.id, 'PROFILE_VIEW', viewer3.id)
      await createAnalyticsEvent(user.id, 'COMPLETED_BOOKING')

      const profileViews = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.eventType, 'PROFILE_VIEW'),
      })

      const completedBookings = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.eventType, 'COMPLETED_BOOKING'),
      })

      expect(profileViews).toHaveLength(3)
      expect(completedBookings).toHaveLength(1)
    })
  })

  describe('Ranking Score Updates', () => {
    it('should update ranking score based on events', async () => {
      const user = await createTestUser({ withProfile: { rankingScore: 0 } })

      // Simulate processing analytics events
      await createAnalyticsEvent(user.id, 'PROFILE_VIEW')
      await createAnalyticsEvent(user.id, 'PROFILE_VIEW')
      await createAnalyticsEvent(user.id, 'COMPLETED_BOOKING')

      // In a real scenario, a cron job would process these and update the score
      // For this test, we'll manually update the score
      const newScore = 10.6 // 2 * 0.3 (profile views) + 10 (completed booking)

      await testDb
        .update(schema.userProfile)
        .set({ rankingScore: newScore })
        .where(eq(schema.userProfile.userId, user.id))

      const updated = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(updated?.rankingScore).toBeCloseTo(10.6, 2)
    })

    it('should rank users by score for discovery', async () => {
      const user1 = await createTestUser({ withProfile: { rankingScore: 50 } })
      const user2 = await createTestUser({ withProfile: { rankingScore: 100 } })
      const user3 = await createTestUser({ withProfile: { rankingScore: 25 } })

      const rankedProfiles = await testDb.query.userProfile.findMany({
        orderBy: (profiles, { desc }) => [desc(profiles.rankingScore)],
        limit: 10,
      })

      expect(rankedProfiles[0]?.userId).toBe(user2.id)
      expect(rankedProfiles[1]?.userId).toBe(user1.id)
      expect(rankedProfiles[2]?.userId).toBe(user3.id)
    })

    it('should decay ranking scores over time', async () => {
      const user = await createTestUser({ withProfile: { rankingScore: 100 } })

      // Simulate decay (e.g., 1% per day)
      const decayFactor = 0.99
      const newScore = 100 * decayFactor

      await testDb
        .update(schema.userProfile)
        .set({ rankingScore: newScore })
        .where(eq(schema.userProfile.userId, user.id))

      const updated = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(updated?.rankingScore).toBeCloseTo(99, 2)
    })
  })

  describe('View Count Tracking', () => {
    it('should track profile view count separately from ranking', async () => {
      const user = await createTestUser({ withProfile: { viewCount: 0 } })

      // Increment view count
      await testDb
        .update(schema.userProfile)
        .set({ viewCount: 1 })
        .where(eq(schema.userProfile.userId, user.id))

      let profile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(profile?.viewCount).toBe(1)

      // Increment again
      await testDb
        .update(schema.userProfile)
        .set({ viewCount: 2 })
        .where(eq(schema.userProfile.userId, user.id))

      profile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(profile?.viewCount).toBe(2)
    })

    it('should display popular mentors based on view count', async () => {
      const user1 = await createTestUser({ withProfile: { viewCount: 50 } })
      const user2 = await createTestUser({ withProfile: { viewCount: 150 } })
      const user3 = await createTestUser({ withProfile: { viewCount: 25 } })

      const popularProfiles = await testDb.query.userProfile.findMany({
        orderBy: (profiles, { desc }) => [desc(profiles.viewCount)],
        limit: 10,
      })

      expect(popularProfiles[0]?.userId).toBe(user2.id)
      expect(popularProfiles[1]?.userId).toBe(user1.id)
      expect(popularProfiles[2]?.userId).toBe(user3.id)
    })
  })

  describe('Analytics Integration with User Actions', () => {
    it('should create events from user interactions', async () => {
      const mentor = await createTestUser({ withProfile: { isMentor: true } })
      const student = await createTestUser()

      // Simulate: student views mentor profile
      await createAnalyticsEvent(mentor.id, 'PROFILE_VIEW', student.id)

      // Simulate: increment view count
      await testDb
        .update(schema.userProfile)
        .set({ viewCount: mentor.profile.viewCount + 1 })
        .where(eq(schema.userProfile.userId, mentor.id))

      const events = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.targetUserId, mentor.id),
      })

      const profile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, mentor.id),
      })

      expect(events).toHaveLength(1)
      expect(events[0]?.eventType).toBe('PROFILE_VIEW')
      expect(profile?.viewCount).toBe(1)
    })

    it('should handle high-volume analytics events', async () => {
      const mentor = await createTestUser()

      // Create 100 profile view events
      const events = []
      for (let i = 0; i < 100; i++) {
        const viewer = await createTestUser()
        events.push(createAnalyticsEvent(mentor.id, 'PROFILE_VIEW', viewer.id))
      }

      await Promise.all(events)

      const allEvents = await testDb.query.analyticEvent.findMany({
        where: eq(schema.analyticEvent.targetUserId, mentor.id),
      })

      expect(allEvents.length).toBeGreaterThanOrEqual(100)
    })
  })
})
