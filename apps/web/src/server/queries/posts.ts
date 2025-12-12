import 'server-only'

import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { z } from 'zod'
import type { Card } from '~/app/types'
import { InternalServerError, NotFoundError } from '~/lib/errors'
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
const transformPostResult = (result: PostQueryResult[]): Card[] => {
  // Transform and ensure uniqueness at application level as safety net
  const uniquePosts = new Map<number, Card>()

  for (const { post, creator, profile, school, major, hasFreeSessions } of result) {
    if (!uniquePosts.has(post.id)) {
      uniquePosts.set(post.id, {
        ...post,
        name: creator.name ?? 'Mentor',
        username: creator.username ?? null,
        calcomUsername: creator.calcomUsername ?? null,
        userImage: creator.image ?? null,
        description: profile?.bio !== undefined ? profile.bio : null,
        graduationYear: profile?.graduationYear ?? null,
        schoolYear: profile?.schoolYear ?? null,
        school: school?.name ?? null,
        schoolDomainPrefix: school?.domainPrefix ?? null,
        major: major?.name ?? null,
        schoolPrimaryColor: school?.primaryColor ?? null,
        schoolSecondaryColor: school?.secondaryColor ?? null,
        hasFreeSessions: hasFreeSessions,
      })
    }
  }

  return Array.from(uniquePosts.values())
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

  let rankingScore: number | undefined
  let randomSortKey: number | undefined
  let postId: number | undefined

  if (cursor) {
    try {
      const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('ascii'))
      if (
        typeof decodedCursor.ranking_score === 'number' &&
        typeof decodedCursor.random_sort_key === 'number' &&
        typeof decodedCursor.post_id === 'number'
      ) {
        rankingScore = decodedCursor.ranking_score
        randomSortKey = decodedCursor.random_sort_key
        postId = decodedCursor.post_id
      }
    } catch (error) {
      console.error('Failed to decode cursor:', error)
    }
  }

  const result = await getPostsWithCursor({
    rankingScore,
    randomSortKey,
    postId,
    limit,
  })

  const hasMore = result.length > limit
  const postsData = hasMore ? result.slice(0, -1) : result
  const nextCursor =
    hasMore && postsData.length > 0
      ? Buffer.from(
          JSON.stringify({
            ranking_score: postsData[postsData.length - 1]?.profile?.rankingScore,
            random_sort_key: postsData[postsData.length - 1]?.post.random_sort_key,
            post_id: postsData[postsData.length - 1]?.post.id,
          })
        ).toString('base64')
      : undefined

  return {
    posts: transformPostResult(postsData),
    nextCursor,
    hasMore,
  }
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

  const hasMore = result.length > validLimit
  const postsData = hasMore ? result.slice(0, -1) : result
  const nextCursor =
    hasMore && postsData.length > 0
      ? Buffer.from(
          JSON.stringify({
            ranking_score: postsData[postsData.length - 1]?.profile?.rankingScore,
            random_sort_key: postsData[postsData.length - 1]?.post.random_sort_key,
          })
        ).toString('base64')
      : undefined

  return {
    posts: transformPostResult(postsData),
    nextCursor,
    hasMore,
  }
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

  const transformedPost = transformPostResult([postData])[0]
  if (!transformedPost) {
    throw new InternalServerError('Failed to transform post data')
  }

  return transformedPost
}

/**
 * Revalidate posts cache
 */
export const revalidatePosts = () => {
  console.log('INVALIDATING POSTS CACHE')
  revalidateTag('posts', 'default')
}
