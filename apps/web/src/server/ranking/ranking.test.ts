import { eq } from 'drizzle-orm'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import * as schema from '~/server/db/schema/index'
import { testDb } from '~/server/db/test-db'
import { processAnalyticsEvents } from './service'

vi.mock('~/server/queries/posts', () => ({
  revalidatePosts: vi.fn(),
}))

vi.mock('server-only', () => {
  return {}
})

type TestUser = { id: string; name: string | null; email: string | null }

const requireTestUser = (user: TestUser | null): TestUser => {
  if (!user) {
    throw new Error('Test user has not been initialized')
  }
  return user
}

describe('Ranking System', () => {
  let testUser: TestUser | null = null

  beforeEach(async () => {
    // Create a test user for each test (avoids race condition with global db reset)
    const userResult = await testDb
      .insert(schema.user)
      .values({ name: 'Test User', email: `ranking-test-${Date.now()}@example.com` })
      .returning()

    testUser = requireTestUser(userResult[0] ?? null)

    await testDb.insert(schema.userProfile).values({
      userId: testUser.id,
      schoolYear: 'Senior',
      graduationYear: 2025,
      rankingScore: 0,
    })
  })

  afterEach(async () => {
    // Clean up test data
    const currentUser = testUser
    if (currentUser?.id) {
      await testDb
        .delete(schema.analyticEvent)
        .where(eq(schema.analyticEvent.targetUserId, currentUser.id))
      await testDb.delete(schema.userProfile).where(eq(schema.userProfile.userId, currentUser.id))
      await testDb.delete(schema.user).where(eq(schema.user.id, currentUser.id))
    }
    testUser = null
  })

  it('should process analytics events and update ranking scores correctly', async () => {
    // 1. Seed unprocessed analytics events
    await testDb.insert(schema.analyticEvent).values([
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: requireTestUser(testUser).id,
        processed: false,
      },
      {
        eventType: 'PROFILE_VIEW',
        targetUserId: requireTestUser(testUser).id,
        processed: false,
      },
      {
        eventType: 'COMPLETED_BOOKING',
        targetUserId: requireTestUser(testUser).id,
        processed: false,
      },
    ])

    // 2. Run the processing function
    await processAnalyticsEvents()

    // 3. Verify the ranking score
    const profile = await testDb.query.userProfile.findFirst({
      where: eq(schema.userProfile.userId, requireTestUser(testUser).id),
    })

    // Expected score: (2 * 0.3) + 10 = 10.6
    expect(profile?.rankingScore).toBeCloseTo(10.6)

    // 4. Verify that events are marked as processed
    const processedEvents = await testDb.query.analyticEvent.findMany({
      where: eq(schema.analyticEvent.targetUserId, requireTestUser(testUser).id),
    })

    expect(processedEvents.every(e => e.processed)).toBe(true)
  })

  it('should not process events that have already been processed', async () => {
    // 1. Seed a processed event
    await testDb.insert(schema.analyticEvent).values({
      eventType: 'PROFILE_VIEW',
      targetUserId: requireTestUser(testUser).id,
      processed: true,
    })

    // 2. Run the processing function
    await processAnalyticsEvents()

    // 3. Verify the ranking score has not changed
    const profile = await testDb.query.userProfile.findFirst({
      where: eq(schema.userProfile.userId, requireTestUser(testUser).id),
    })

    expect(profile?.rankingScore).toBe(0)
  })
})
