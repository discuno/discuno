import 'server-only'

import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import { analyticEvent, userProfile } from '~/server/db/schema/index'
import { revalidatePosts } from '~/server/queries/posts'

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
  await db.update(userProfile).set({
    rankingScore: sql`"ranking_score" * (1.0 - ${RANKING_EVENT_WEIGHTS.WEEKLY_DECAY_PERCENTAGE})`,
  })
  revalidatePosts()
}

/**
 * Processes analytics events to update mentor ranking scores.
 */
export async function processAnalyticsEvents() {
  const processedCount = await db.transaction(async tx => {
    const events = await tx.query.analyticEvent.findMany({
      where: (events, { eq }) => eq(events.processed, false),
    })

    if (events.length === 0) return 0

    const scoreChanges = new Map<string, number>()
    for (const event of events) {
      const weight = RANKING_EVENT_WEIGHTS[event.eventType as RankingEvent]
      if (weight) {
        const currentScore = scoreChanges.get(event.targetUserId) ?? 0
        scoreChanges.set(event.targetUserId, currentScore + weight)
      }
    }

    // Keep score updates and the processed markers in one transaction. A crash
    // can therefore never apply a score without also consuming its events.
    for (const [mentorId, scoreChange] of scoreChanges) {
      await tx
        .update(userProfile)
        .set({
          rankingScore: sql`"ranking_score" + ${scoreChange}`,
        })
        .where(eq(userProfile.userId, mentorId))
    }

    await tx
      .update(analyticEvent)
      .set({ processed: true })
      .where(
        inArray(
          analyticEvent.id,
          events.map(event => event.id)
        )
      )

    return events.length
  })

  if (processedCount > 0) revalidatePosts()
}
