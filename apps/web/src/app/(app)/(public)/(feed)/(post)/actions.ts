'use server'

import { z } from 'zod'
import { getAuthSession } from '~/lib/auth/auth-utils'
import { db } from '~/server/db'
import { analyticsEventEnum, analyticsEvents } from '~/server/db/schema'
import { getPostsByFilters, getPostsCursor } from '~/server/queries'

const logAnalyticsEventSchema = z.object({
  eventType: z.enum(analyticsEventEnum.enumValues),
  targetUserId: z.string(),
  postId: z.number().optional(),
  fingerprint: z.string().optional(),
})

export const logAnalyticsEvent = async (input: {
  eventType: 'profile_view' | 'post_like' | 'discord_activity' | 'chat_reply'
  targetUserId: string
  postId?: number
  fingerprint?: string
}) => {
  const { eventType, targetUserId, postId, fingerprint } = logAnalyticsEventSchema.parse(input)
  const session = await getAuthSession()
  const actorUserId = session?.id

  try {
    await db.insert(analyticsEvents).values({
      eventType,
      actorUserId,
      targetUserId,
      postId,
      fingerprint,
    })
  } catch (error: unknown) {
    console.log(error)
  }
}

/**
 * Server actions for infinite scroll with cursor-based pagination
 */
export const fetchPostsAction = async (limit = 20, cursor?: number) => {
  return await getPostsCursor(limit, cursor)
}

export const fetchPostsByFilterAction = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  cursor?: number
) => {
  return await getPostsByFilters(schoolId, majorId, graduationYear, limit, cursor)
}
