import 'server-only'

import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { z } from 'zod'
import type { Card } from '~/app/types'
import { NotFoundError } from '~/lib/errors'
import type { PostQueryResult } from '~/server/dal/posts'
import {
  getPostById as getPostByIdDal,
  getPostsWithCursor,
  getPostsWithFilters,
} from '~/server/dal/posts'

/**
 * Query Layer for posts
 * Includes caching, transformations, and business logic
 */

// Input validation schemas
const postIdSchema = z.object({
  id: z.number().int().positive(),
})

const filterSchema = z.object({
  schoolId: z.number().int().positive().nullable(),
  majorId: z.number().int().positive().nullable(),
  graduationYear: z.number().int().min(1900).max(2100).nullable(),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
})

/**
 * Transform post query results to Card type
 */
type CursorValues = {
  rankingScore?: number
  randomSortKey?: number
  postId?: number
}

const decodeCursor = (cursor?: string): CursorValues => {
  if (!cursor) {
    return {}
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('ascii')) as Record<
      string,
      unknown
    >

    const rankingScore = decoded.ranking_score
    const randomSortKey = decoded.random_sort_key
    const postId = decoded.post_id

    return {
      rankingScore: typeof rankingScore === 'number' ? rankingScore : undefined,
      randomSortKey: typeof randomSortKey === 'number' ? randomSortKey : undefined,
      postId: typeof postId === 'number' ? postId : undefined,
    }
  } catch (error) {
    console.error('Failed to decode cursor:', error)
    return {}
  }
}

const createCursorPayload = (post?: PostQueryResult) => {
  if (!post) {
    return undefined
  }

  const payloadEntries: Array<[string, number | null | undefined]> = [
    ['ranking_score', post.profile?.rankingScore],
    ['random_sort_key', post.post.random_sort_key],
    ['post_id', post.post.id],
  ]

  const definedEntries = payloadEntries.filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  )

  if (definedEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(definedEntries)
}

const encodeCursor = (post?: PostQueryResult) => {
  const payload = createCursorPayload(post)
  return payload ? Buffer.from(JSON.stringify(payload)).toString('base64') : undefined
}

const mapPostToCard = ({
  post,
  creator,
  profile,
  school,
  major,
  hasFreeSessions,
}: PostQueryResult): Card => ({
  ...post,
  name: creator?.name ?? 'Mentor',
  userImage: creator?.image ?? null,
  description: profile?.bio ?? null,
  graduationYear: profile?.graduationYear ?? null,
  schoolYear: profile?.schoolYear ?? null,
  school: school?.name ?? null,
  schoolDomainPrefix: school?.domainPrefix ?? null,
  major: major?.name ?? null,
  schoolPrimaryColor: school?.primaryColor ?? null,
  schoolSecondaryColor: school?.secondaryColor ?? null,
  hasFreeSessions,
})

const transformPostResult = (result: PostQueryResult[]): Card[] => {
  // Transform and ensure uniqueness at application level as safety net
  const uniquePosts = new Map<number, Card>()

  for (const postResult of result) {
    if (!uniquePosts.has(postResult.post.id)) {
      uniquePosts.set(postResult.post.id, mapPostToCard(postResult))
    }
  }

  return Array.from(uniquePosts.values())
}

const buildPaginatedResponse = (result: PostQueryResult[], limit: number) => {
  const hasMore = result.length > limit
  const postsData = hasMore ? result.slice(0, -1) : result
  const lastPost = postsData.length > 0 ? postsData[postsData.length - 1] : undefined
  const nextCursor = hasMore ? encodeCursor(lastPost) : undefined

  return {
    posts: transformPostResult(postsData),
    nextCursor,
    hasMore,
  }
}

/**
 * Get infinite scroll posts with cursor-based pagination
 */
export const getInfiniteScrollPosts = async (
  limit = 20,
  cursor?: string
): Promise<{
  posts: Card[]
  nextCursor?: string
  hasMore: boolean
}> => {
  'use cache'
  cacheLife('max')
  cacheTag('posts')

  console.log('CACHE MISS: Executing getInfiniteScrollPosts with limit:', limit, 'cursor:', cursor)

  const { rankingScore, randomSortKey, postId } = decodeCursor(cursor)

  const result = await getPostsWithCursor({
    rankingScore,
    randomSortKey,
    postId,
    limit,
  })

  return buildPaginatedResponse(result, limit)
}

/**
 * Get posts by filters
 */
export const getPostsByFilters = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  cursor?: string
): Promise<{
  posts: Card[]
  nextCursor?: string
  hasMore: boolean
}> => {
  'use cache'
  cacheLife('max')
  cacheTag('posts')

  const {
    schoolId: validSchoolId,
    majorId: validMajorId,
    graduationYear: validGraduationYear,
    limit: validLimit,
  } = filterSchema.parse({
    schoolId,
    majorId,
    graduationYear,
    limit,
    cursor,
  })

  // Return all posts if no filters
  if ([validSchoolId, validMajorId, validGraduationYear].every(f => f === null || f === -1)) {
    return getInfiniteScrollPosts(validLimit, cursor)
  }

  const result = await getPostsWithFilters({
    schoolId: validSchoolId,
    majorId: validMajorId,
    graduationYear: validGraduationYear,
    limit: validLimit,
  })

  return buildPaginatedResponse(result, validLimit)
}

/**
 * Get post by ID
 */
export const getPostById = async (id: number): Promise<Card> => {
  const { id: validId } = postIdSchema.parse({ id })
  console.log(`Fetching post with ID: ${validId}`)

  const post = await getPostByIdDal(validId)

  if (post.length === 0) {
    console.error(`Post with ID ${validId} not found or conditions not met.`)
    throw new NotFoundError('Post not found')
  }

  const postData = post[0]
  if (!postData) {
    throw new NotFoundError('Post not found')
  }

  return mapPostToCard(postData)
}

/**
 * Revalidate posts cache
 */
export const revalidatePosts = () => {
  console.log('INVALIDATING POSTS CACHE')
  revalidateTag('posts', 'default')
}
