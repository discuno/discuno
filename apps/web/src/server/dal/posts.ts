import 'server-only'

import { and, desc, eq, exists, gt, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import {
  calcomToken,
  major,
  mentorEventType,
  mentorStripeAccount,
  post,
  school,
  user,
  userMajor,
  userProfile,
  userSchool,
} from '~/server/db/schema/index'

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
        id: post.id,
        createdById: post.createdById,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        deletedAt: post.deletedAt,
        random_sort_key: post.random_sort_key,
      },
      creator: {
        name: user.name,
        username: user.username,
        image: user.image,
        calcomUsername: calcomToken.calcomUsername,
      },
      profile: {
        graduationYear: userProfile.graduationYear,
        schoolYear: userProfile.schoolYear,
        rankingScore: userProfile.rankingScore,
        bio: userProfile.bio,
      },
      school: {
        name: school.name,
        domainPrefix: school.domainPrefix,
        primaryColor: school.primaryColor,
        secondaryColor: school.secondaryColor,
      },
      major: {
        name: major.name,
      },
      hasFreeSessions: sql<boolean>`
        ${exists(
          db
            .select({ id: mentorEventType.id })
            .from(mentorEventType)
            .where(
              and(
                eq(mentorEventType.mentorUserId, user.id),
                eq(mentorEventType.isEnabled, true),
                or(eq(mentorEventType.customPrice, 0), isNull(mentorEventType.customPrice)),
                isNull(mentorEventType.deletedAt)
              )
            )
        )}
      `.as('has_free_sessions'),
    })
    .from(post)
    .leftJoin(user, eq(post.createdById, user.id))
    .leftJoin(userProfile, eq(user.id, userProfile.userId))
    .leftJoin(
      userSchool,
      and(
        eq(user.id, userSchool.userId),
        isNull(userSchool.deletedAt),
        // Only join the first school by using a correlated subquery
        eq(
          userSchool.id,
          sql`(SELECT id FROM ${userSchool} WHERE user_id = ${user.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
        )
      )
    )
    .leftJoin(school, eq(userSchool.schoolId, school.id))
    .leftJoin(
      userMajor,
      and(
        eq(user.id, userMajor.userId),
        isNull(userMajor.deletedAt),
        // Only join the first major by using a correlated subquery
        eq(
          userMajor.id,
          sql`(SELECT id FROM ${userMajor} WHERE user_id = ${user.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
        )
      )
    )
    .leftJoin(major, eq(userMajor.majorId, major.id))
    .leftJoin(mentorEventType, eq(user.id, mentorEventType.mentorUserId))
    .leftJoin(mentorStripeAccount, eq(user.id, mentorStripeAccount.userId))
    .leftJoin(calcomToken, eq(user.id, calcomToken.userId))

  return baseQuery
}

/**
 * Common WHERE conditions for active, visible posts
 */
export const getActivePostConditions = () => {
  return [
    isNotNull(userProfile.id), // Ensure the user has a profile
    isNull(post.deletedAt), // Exclude deleted posts
    // Ensure the mentor has at least one bookable event type (matching active status)
    exists(
      db
        .select({ id: mentorEventType.id })
        .from(mentorEventType)
        .leftJoin(mentorStripeAccount, eq(mentorEventType.mentorUserId, mentorStripeAccount.userId))
        .where(
          and(
            eq(mentorEventType.mentorUserId, user.id),
            eq(mentorEventType.isEnabled, true),
            or(
              // Free event types (price is 0 or null)
              eq(mentorEventType.customPrice, 0),
              isNull(mentorEventType.customPrice),
              // Paid event types with Stripe charges enabled
              and(gt(mentorEventType.customPrice, 0), eq(mentorStripeAccount.chargesEnabled, true))
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
              lt(userProfile.rankingScore, rankingScore),
              and(
                eq(userProfile.rankingScore, rankingScore),
                lt(post.random_sort_key, randomSortKey)
              ),
              and(
                eq(userProfile.rankingScore, rankingScore),
                eq(post.random_sort_key, randomSortKey),
                lt(post.id, postId)
              )
            )
          : undefined,
        ...getActivePostConditions()
      )
    )
    .orderBy(desc(userProfile.rankingScore), desc(post.random_sort_key), desc(post.id))
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
    conditions.push(eq(school.id, schoolId))
  }
  if (majorId !== null && majorId !== undefined && majorId !== -1) {
    conditions.push(eq(major.id, majorId))
  }
  if (graduationYear !== null && graduationYear !== undefined && graduationYear !== -1) {
    conditions.push(eq(userProfile.graduationYear, graduationYear))
  }

  const result = await buildPostsQuery()
    .where(and(...conditions))
    .orderBy(desc(userProfile.rankingScore), desc(post.random_sort_key), desc(post.id))
    .limit(limit + 1) // Fetch one extra to check if there are more

  return result
}

/**
 * Get single post by ID
 */
export const getPostById = async (postId: number) => {
  const result = await buildPostsQuery()
    .where(and(eq(post.id, postId), ...getActivePostConditions()))
    .limit(1)

  return result
}

/**
 * Create a new post
 */
export const createPost = async (createdById: string) => {
  const [pst] = await db.insert(post).values({ createdById }).returning()

  return pst ?? null
}
