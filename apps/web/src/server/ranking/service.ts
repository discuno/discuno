import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import { analyticsEvents, userProfiles } from '~/server/db/schema'

export const RANKING_EVENT_WEIGHTS = {
  PROFILE_VIEW: 0.3,
  COMPLETED_BOOKING: 10,
  CANCELLED_BOOKING: -5,
  WEEKLY_DECAY_PERCENTAGE: 0.05, // 5%
}

export const RANKING_EVENT_CAPS = {
  PROFILE_VIEW: {
    count: 10,
    duration: { weeks: 1 },
  },
}

type RankingEvent = keyof typeof RANKING_EVENT_WEIGHTS

/**
 * Decays all mentor ranking scores by a percentage.
 */
export async function decayRankingScores() {
  await db.update(userProfiles).set({
    rankingScore: sql`"ranking_score" * (1 - ${RANKING_EVENT_WEIGHTS.WEEKLY_DECAY_PERCENTAGE})`,
  })
}

/**
 * Processes analytics events to update mentor ranking scores.
 */
export async function processAnalyticsEvents() {
  // Get all unprocessed analytics events
  const events = await db.query.analyticsEvents.findMany({
    where: (events, { eq }) => eq(events.processed, false),
  })

  if (events.length === 0) {
    return
  }

  // Calculate score changes for each mentor
  const scoreChanges = new Map<string, number>()
  for (const event of events) {
    const weight = RANKING_EVENT_WEIGHTS[event.eventType as RankingEvent]
    if (weight) {
      const currentScore = scoreChanges.get(event.targetUserId) ?? 0
      scoreChanges.set(event.targetUserId, currentScore + weight)
    }
  }

  // Update mentor ranking scores in a batch
  const promises = Array.from(scoreChanges.entries()).map(([mentorId, scoreChange]) => {
    return db
      .update(userProfiles)
      .set({
        rankingScore: sql`"ranking_score" + ${scoreChange}`,
      })
      .where(eq(userProfiles.userId, mentorId))
  })

  await Promise.all(promises)

  // Mark events as processed
  await db
    .update(analyticsEvents)
    .set({ processed: true })
    .where(
      inArray(
        analyticsEvents.id,
        events.map(e => e.id)
      )
    )
}
