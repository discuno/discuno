import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { env } from '~/env'
import { db } from '~/server/db'
import { analyticsEvents, userProfiles } from '~/server/db/schema'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }

  try {
    // Calculate scores based on profile views in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const mentorScores = await db
      .select({
        targetUserId: analyticsEvents.targetUserId,
        score: sql<number>`count(${analyticsEvents.id})`.mapWith(Number),
      })
      .from(analyticsEvents)
      .where(
        sql`"discuno_analytics_event"."event_type" = 'profile_view' AND "discuno_analytics_event"."created_at" >= ${sevenDaysAgo}`
      )
      .groupBy(analyticsEvents.targetUserId)

    // Update user profile scores in a transaction
    await db.transaction(async tx => {
      for (const { targetUserId, score } of mentorScores) {
        if (targetUserId) {
          await tx
            .update(userProfiles)
            .set({ rankingScore: score })
            .where(sql`user_id = ${targetUserId}`)
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating mentor scores:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
