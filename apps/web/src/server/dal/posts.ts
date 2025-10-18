import 'server-only'

import { and, desc, eq, exists, gt, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import {
  majors,
  mentorEventTypes,
  mentorStripeAccounts,
  posts,
  schools,
  userMajors,
  userProfiles,
  users,
  userSchools,
} from '~/server/db/schema'

/**
 * Data Access Layer for posts table
 * Raw database operations with no caching or auth checks
 */

/**
 * Build base posts query with all necessary joins
 * This is a reusable query builder that other functions can extend
 */
export const buildPostsQuery = () => {
  const baseQuery = db
    .selectDistinct({
      post: {
        id: posts.id,
        createdById: posts.createdById,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
        random_sort_key: posts.random_sort_key,
      },
      creator: {
        name: users.name,
        image: users.image,
      },
      profile: {
        graduationYear: userProfiles.graduationYear,
        schoolYear: userProfiles.schoolYear,
        rankingScore: userProfiles.rankingScore,
        bio: userProfiles.bio,
      },
      school: {
        name: schools.name,
        primaryColor: schools.primaryColor,
        secondaryColor: schools.secondaryColor,
      },
      major: {
        name: majors.name,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdById, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(
      userSchools,
      and(
        eq(users.id, userSchools.userId),
        isNull(userSchools.deletedAt),
        // Only join the first school by using a correlated subquery
        eq(
          userSchools.id,
          sql`(SELECT id FROM ${userSchools} WHERE user_id = ${users.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
        )
      )
    )
    .leftJoin(schools, eq(userSchools.schoolId, schools.id))
    .leftJoin(
      userMajors,
      and(
        eq(users.id, userMajors.userId),
        isNull(userMajors.deletedAt),
        // Only join the first major by using a correlated subquery
        eq(
          userMajors.id,
          sql`(SELECT id FROM ${userMajors} WHERE user_id = ${users.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
        )
      )
    )
    .leftJoin(majors, eq(userMajors.majorId, majors.id))
    .leftJoin(mentorEventTypes, eq(users.id, mentorEventTypes.mentorUserId))
    .leftJoin(mentorStripeAccounts, eq(users.id, mentorStripeAccounts.userId))

  return baseQuery
}

/**
 * Common WHERE conditions for active, visible posts
 */
export const getActivePostConditions = () => {
  return [
    isNotNull(userProfiles.id), // Ensure the user has a profile
    isNull(posts.deletedAt), // Exclude deleted posts
    // Ensure the mentor has at least one bookable event type (matching active status)
    exists(
      db
        .select({ id: mentorEventTypes.id })
        .from(mentorEventTypes)
        .leftJoin(
          mentorStripeAccounts,
          eq(mentorEventTypes.mentorUserId, mentorStripeAccounts.userId)
        )
        .where(
          and(
            eq(mentorEventTypes.mentorUserId, users.id),
            eq(mentorEventTypes.isEnabled, true),
            or(
              // Free event types (price is 0 or null)
              eq(mentorEventTypes.customPrice, 0),
              isNull(mentorEventTypes.customPrice),
              // Paid event types with Stripe charges enabled
              and(
                gt(mentorEventTypes.customPrice, 0),
                eq(mentorStripeAccounts.chargesEnabled, true)
              )
            )
          )
        )
    ),
  ]
}

export type PostQueryResult = Awaited<ReturnType<typeof buildPostsQuery>>[number]

/**
 * Get posts with cursor-based pagination
 */
export const getPostsWithCursor = async ({
  rankingScore,
  randomSortKey,
  postId,
  limit,
}: {
  rankingScore?: number
  randomSortKey?: number
  postId?: number
  limit: number
}) => {
  const result = await buildPostsQuery()
    .where(
      and(
        rankingScore !== undefined && randomSortKey !== undefined && postId !== undefined
          ? or(
              lt(userProfiles.rankingScore, rankingScore),
              and(
                eq(userProfiles.rankingScore, rankingScore),
                lt(posts.random_sort_key, randomSortKey)
              ),
              and(
                eq(userProfiles.rankingScore, rankingScore),
                eq(posts.random_sort_key, randomSortKey),
                lt(posts.id, postId)
              )
            )
          : undefined,
        ...getActivePostConditions()
      )
    )
    .orderBy(desc(userProfiles.rankingScore), desc(posts.random_sort_key), desc(posts.id))
    .limit(limit + 1) // Fetch one extra to check if there are more

  return result
}

/**
 * Get posts with filters and cursor-based pagination
 */
export const getPostsWithFilters = async ({
  schoolId,
  majorId,
  graduationYear,
  limit,
}: {
  schoolId?: number | null
  majorId?: number | null
  graduationYear?: number | null
  limit: number
}) => {
  const conditions = [...getActivePostConditions()]

  if (schoolId !== null && schoolId !== undefined && schoolId !== -1) {
    conditions.push(eq(schools.id, schoolId))
  }
  if (majorId !== null && majorId !== undefined && majorId !== -1) {
    conditions.push(eq(majors.id, majorId))
  }
  if (graduationYear !== null && graduationYear !== undefined && graduationYear !== -1) {
    conditions.push(eq(userProfiles.graduationYear, graduationYear))
  }

  const result = await buildPostsQuery()
    .where(and(...conditions))
    .orderBy(desc(userProfiles.rankingScore), desc(posts.random_sort_key), desc(posts.id))
    .limit(limit + 1) // Fetch one extra to check if there are more

  return result
}

/**
 * Get single post by ID
 */
export const getPostById = async (postId: number) => {
  const result = await buildPostsQuery()
    .where(and(eq(posts.id, postId), ...getActivePostConditions()))
    .limit(1)

  return result
}

/**
 * Create a new post
 */
export const createPost = async (createdById: string) => {
  const [post] = await db.insert(posts).values({ createdById }).returning()

  return post ?? null
}
