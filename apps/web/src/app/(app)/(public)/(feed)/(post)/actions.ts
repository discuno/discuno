'use server'

import { getAuthSession } from '~/lib/auth/auth-utils'
import type { NewAnalyticsEvent } from '~/lib/schemas/db/analyticsEvents'
import { createAnalyticsEvent, getPostsByFilters, getPostsCursor } from '~/server/queries'

export const logAnalyticsEvent = async (input: NewAnalyticsEvent) => {
  const session = await getAuthSession()
  const actorUserId = session?.id

  await createAnalyticsEvent({
    ...input,
    actorUserId,
  })
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
