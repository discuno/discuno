import { eq } from 'drizzle-orm'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { analyticsEvents, userProfiles, users } from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { processAnalyticsEvents } from './service'

vi.mock('~/server/queries', () => ({
  revalidatePosts: vi.fn(),
}))

vi.mock('server-only', () => {
  return {}
})

describe('Ranking System', () => {
  let testUser: { id: string; name: string | null; email: string | null }

  beforeAll(async () => {
    // Create a test user
    const userResult = await testDb
      .insert(users)
      .values({ name: 'Test User', email: 'test@example.com' })
      .returning()
    testUser = userResult[0]!

    await testDb.insert(userProfiles).values({
      userId: testUser.id,
      schoolYear: 'Senior',
      graduationYear: 2025,
      rankingScore: 0,
    })
  })

  afterEach(async () => {
    // Clean up analytics events and reset ranking score
    await testDb.delete(analyticsEvents).where(eq(analyticsEvents.targetUserId, testUser.id))
    await testDb
      .update(userProfiles)
      .set({ rankingScore: 0 })
      .where(eq(userProfiles.userId, testUser.id))
  })

  it('should process analytics events and update ranking scores correctly', async () => {
    // 1. Seed unprocessed analytics events
    await testDb.insert(analyticsEvents).values([
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUser.id,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: testUser.id,
        processed: false,
      },
      {
        eventType: 'COMPLETED_BOOKING',
        targetUserId: testUser.id,
        processed: false,
      },
    ])

    // 2. Run the processing function
    await processAnalyticsEvents()

    // 3. Verify the ranking score
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUser.id),
    })

    // Expected score: (2 * 0.3) + 10 = 10.6
    expect(profile?.rankingScore).toBeCloseTo(10.6)

    // 4. Verify that events are marked as processed
    const processedEvents = await testDb.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.targetUserId, testUser.id),
    })

    expect(processedEvents.every(e => e.processed)).toBe(true)
  })

  it('should not process events that have already been processed', async () => {
    // 1. Seed a processed event
    await testDb.insert(analyticsEvents).values({
      eventType: 'PROFILE_VIEW',
      targetUserId: testUser.id,
      processed: true,
    })

    // 2. Run the processing function
    await processAnalyticsEvents()

    // 3. Verify the ranking score has not changed
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUser.id),
    })

    expect(profile?.rankingScore).toBe(0)
  })
})
