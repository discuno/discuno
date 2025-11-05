'use server'
import 'server-only'

import { headers } from 'next/headers'
import { getAuthSession } from '~/lib/auth/auth-utils'
import { ratelimit } from '~/lib/rate-limiter'
import type { ClientAnalyticsEvent } from '~/lib/schemas/db/analyticsEvents'
import { createAnalyticsEvent } from '~/server/dal/analytics'
import { getInfiniteScrollPosts, getPostById, getPostsByFilters } from '~/server/queries/posts'
import { getFullProfileByUserId } from '~/server/queries/profiles'

export const logAnalyticsEvent = async (input: ClientAnalyticsEvent) => {
  const res = await getAuthSession()
  const actorUserId = res?.session.userId

  await createAnalyticsEvent({
    ...input,
    actorUserId,
    distinctId: input.distinctId,
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

/**
 * Fetch a single post by ID
 * Used by the modal to get post details
 */
export const fetchPostByIdAction = async (postId: number) => {
  const ip = await getClientKey()
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    throw new Error('Too many requests')
  }
  return await getPostById(postId)
}

/**
 * Fetch profile by user ID
 * Used by the modal to get booking data
 */
export const fetchProfileByUserIdAction = async (userId: string) => {
  const ip = await getClientKey()
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    throw new Error('Too many requests')
  }
  return await getFullProfileByUserId(userId)
}
