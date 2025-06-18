'use server'

import { getPostsByFilters, getPostsCursor } from '~/server/queries'

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
