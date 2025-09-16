'use server'

import { headers } from 'next/headers'
import { getAuthSession } from '~/lib/auth/auth-utils'
import { ratelimit } from '~/lib/rate-limiter'
import type { NewAnalyticsEvent } from '~/lib/schemas/db/analyticsEvents'
import { createAnalyticsEvent, getInfiniteScrollPosts, getPostsByFilters } from '~/server/queries'

export const logAnalyticsEvent = async (input: NewAnalyticsEvent) => {
  const session = await getAuthSession()
  const actorUserId = session?.id

  await createAnalyticsEvent({
    ...input,
    actorUserId,
  })
}

const getClientKey = async () => {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? '127.0.0.1'
  return ip
}

/**
 * Server actions for infinite scroll with cursor-based pagination
 */
export const fetchPostsAction = async (limit = 20, cursor?: string) => {
  const ip = await getClientKey()
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    throw new Error('Too many requests')
  }
  return await getInfiniteScrollPosts(limit, cursor)
}

export const fetchPostsByFilterAction = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  cursor?: string
) => {
  const ip = await getClientKey()
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    throw new Error('Too many requests')
  }
  return await getPostsByFilters(schoolId, majorId, graduationYear, limit, cursor)
}
