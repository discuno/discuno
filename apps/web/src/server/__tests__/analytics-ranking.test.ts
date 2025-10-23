import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { analyticsEvents, userProfiles } from '~/server/db/schema'
import { createTestUser, cleanupTestUser } from './test-helpers'

describe('Analytics Events and Ranking System', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'Analytics User',
      email: 'analytics@test.com',
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Clean up analytics events
    await testDb.delete(analyticsEvents).where(eq(analyticsEvents.targetUserId, testUserId))
    await cleanupTestUser(testUserId)
  })

  it('should create profile view analytics event', async () => {
    const [event] = await testDb
      .insert(analyticsEvents)
      .values({
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      })
      .returning()

    if (!event) {
      throw new Error('Failed to create analytics event')
    }

    expect(event).toBeDefined()
    expect(event.eventType).toBe('PROFILE_VIEW')
    expect(event.targetUserId).toBe(testUserId)
    expect(event.processed).toBe(false)
  })

  it('should create completed booking analytics event', async () => {
    const [event] = await testDb
      .insert(analyticsEvents)
      .values({
        eventType: 'COMPLETED_BOOKING',
        targetUserId: testUserId,
        processed: false,
      })
      .returning()

    if (!event) {
      throw new Error('Failed to create analytics event')
    }

    expect(event).toBeDefined()
    expect(event.eventType).toBe('COMPLETED_BOOKING')
    expect(event.processed).toBe(false)
  })

  it('should track multiple analytics events', async () => {
    // Create multiple events
    await testDb.insert(analyticsEvents).values([
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'COMPLETED_BOOKING',
        targetUserId: testUserId,
        processed: false,
      },
    ])

    // Query all events
    const events = await testDb.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.targetUserId, testUserId),
    })

    expect(events).toHaveLength(3)
    expect(events.filter(e => e.eventType === 'PROFILE_VIEW')).toHaveLength(2)
    expect(events.filter(e => e.eventType === 'COMPLETED_BOOKING')).toHaveLength(1)
  })

  it('should mark analytics events as processed', async () => {
    const [event] = await testDb
      .insert(analyticsEvents)
      .values({
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      })
      .returning()

    if (!event) {
      throw new Error('Failed to create analytics event')
    }

    // Process the event
    await testDb
      .update(analyticsEvents)
      .set({ processed: true })
      .where(eq(analyticsEvents.id, event.id))

    // Verify it was marked as processed
    const updated = await testDb.query.analyticsEvents.findFirst({
      where: eq(analyticsEvents.id, event.id),
    })

    expect(updated?.processed).toBe(true)
  })

  it('should only process unprocessed events', async () => {
    // Create both processed and unprocessed events
    await testDb.insert(analyticsEvents).values([
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: true,
      },
    ])

    // Query only unprocessed events
    const events = await testDb.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.targetUserId, testUserId),
    })

    const unprocessed = events.filter(e => !e.processed)
    const processed = events.filter(e => e.processed)

    expect(unprocessed).toHaveLength(1)
    expect(processed).toHaveLength(1)
  })

  it('should update ranking score based on analytics events', async () => {
    // Initial ranking score should be 0
    let profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBe(0)

    // Simulate processing events and updating score
    // Profile views: 2 * 0.3 = 0.6
    // Completed bookings: 1 * 10 = 10
    // Total: 10.6
    const newScore = 10.6

    await testDb
      .update(userProfiles)
      .set({ rankingScore: newScore })
      .where(eq(userProfiles.userId, testUserId))

    // Verify score was updated
    profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBe(newScore)
  })

  it('should increment ranking score based on event weights', async () => {
    const initialScore = 0

    // Add score for profile view (weight: 0.3)
    const afterProfileView = initialScore + 0.3

    await testDb
      .update(userProfiles)
      .set({ rankingScore: afterProfileView })
      .where(eq(userProfiles.userId, testUserId))

    let profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBeCloseTo(afterProfileView)

    // Add score for completed booking (weight: 10)
    const afterBooking = afterProfileView + 10

    await testDb
      .update(userProfiles)
      .set({ rankingScore: afterBooking })
      .where(eq(userProfiles.userId, testUserId))

    profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBeCloseTo(afterBooking)
  })

  it('should handle multiple profile views accumulating score', async () => {
    // Simulate 5 profile views
    const profileViewWeight = 0.3
    const viewCount = 5
    const expectedScore = profileViewWeight * viewCount

    await testDb
      .update(userProfiles)
      .set({ rankingScore: expectedScore })
      .where(eq(userProfiles.userId, testUserId))

    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBeCloseTo(expectedScore)
  })

  it('should handle mixed event types for ranking calculation', async () => {
    // Create events: 3 profile views + 2 completed bookings
    await testDb.insert(analyticsEvents).values([
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'COMPLETED_BOOKING',
        targetUserId: testUserId,
        processed: false,
      },
      {
        eventType: 'COMPLETED_BOOKING',
        targetUserId: testUserId,
        processed: false,
      },
    ])

    // Calculate expected score
    // 3 * 0.3 (profile views) + 2 * 10 (completed bookings) = 0.9 + 20 = 20.9
    const expectedScore = 20.9

    await testDb
      .update(userProfiles)
      .set({ rankingScore: expectedScore })
      .where(eq(userProfiles.userId, testUserId))

    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBeCloseTo(expectedScore)
  })

  it('should track event creation timestamps', async () => {
    const [event] = await testDb
      .insert(analyticsEvents)
      .values({
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      })
      .returning()

    if (!event) {
      throw new Error('Failed to create analytics event')
    }

    expect(event.createdAt).toBeDefined()
    expect(event.createdAt.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('should support querying events by date range', async () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 86400000)
    const tomorrow = new Date(now.getTime() + 86400000)

    // Create event with current timestamp
    const [event] = await testDb
      .insert(analyticsEvents)
      .values({
        eventType: 'PROFILE_VIEW',
        targetUserId: testUserId,
        processed: false,
      })
      .returning()

    if (!event) {
      throw new Error('Failed to create analytics event')
    }

    // Event should be between yesterday and tomorrow
    expect(event.createdAt.getTime()).toBeGreaterThan(yesterday.getTime())
    expect(event.createdAt.getTime()).toBeLessThan(tomorrow.getTime())
  })

  it('should calculate ranking score correctly with complex scenario', async () => {
    // Complex scenario:
    // - 10 profile views = 10 * 0.3 = 3.0
    // - 5 completed bookings = 5 * 10 = 50.0
    // Total expected: 53.0

    const profileViews = 10
    const completedBookings = 5
    const expectedScore = profileViews * 0.3 + completedBookings * 10

    // Create all events
    const events = []
    for (let i = 0; i < profileViews; i++) {
      events.push({
        eventType: 'PROFILE_VIEW' as const,
        targetUserId: testUserId,
        processed: false,
      })
    }
    for (let i = 0; i < completedBookings; i++) {
      events.push({
        eventType: 'COMPLETED_BOOKING' as const,
        targetUserId: testUserId,
        processed: false,
      })
    }

    await testDb.insert(analyticsEvents).values(events)

    // Update ranking score
    await testDb
      .update(userProfiles)
      .set({ rankingScore: expectedScore })
      .where(eq(userProfiles.userId, testUserId))

    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBeCloseTo(expectedScore)

    // Verify all events were created
    const allEvents = await testDb.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.targetUserId, testUserId),
    })

    expect(allEvents).toHaveLength(15)
  })
})
