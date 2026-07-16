import 'server-only'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { cache } from 'react'
import type { FullUserProfile } from '~/app/types'
import { getAuthSession, requirePermission } from '~/lib/auth/auth-utils'
import { NotFoundError } from '~/lib/errors'
import type { UserProfile } from '~/lib/schemas/db'
import { getActivePostConditions } from '~/server/dal/posts'
import { getProfileByUserId } from '~/server/dal/profiles'
import { getUserById, getUserImageById } from '~/server/dal/users'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'
import { hasVerifiedSchoolEmail } from '~/server/queries/school-email-verification'

/**
 * Query Layer for profiles
 *
 * SECURITY: Permission checks enforced here (data access layer)
 * Layouts/actions/services delegate to these functions for protection
 *
 * NOTE: Profiles in Discuno are mentor-specific (public-facing profiles with bio, school, etc.)
 * Regular users don't have profiles. Profile access requires mentor permission.
 */

/**
 * Get profile picture URL for current mentor
 * Protected by mentor permission (data access layer)
 */
export const getProfilePic = cache(async (): Promise<string> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const id = user.id

  const image = await getUserImageById(id)

  if (!image) {
    throw new NotFoundError('User image not found')
  }

  return image
})

/**
 * Get basic profile for current mentor
 * Protected by mentor permission (data access layer)
 */
export const getProfile = cache(
  async (): Promise<{ profile: UserProfile | null; userId: string }> => {
    const { user } = await requirePermission({ mentor: ['manage'] })
    const userId = user.id

    const profile = await getProfileByUserId(userId)

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    return { profile, userId }
  }
)

/**
 * Get profile with image for display (unauthenticated OK)
 */
const getProfileWithImage = async (): Promise<{
  profilePic: string | null
} | null> => {
  const res = await getAuthSession()
  const session = res?.session
  const user = res?.user

  if (!session?.userId || user?.isAnonymous) {
    return null
  }

  const userRecord = await getUserById(session.userId)

  return {
    profilePic: userRecord?.image ?? null,
  }
}

export const getProfileWithImageCached = cache(getProfileWithImage)

/**
 * Get full profile by user ID (internal use)
 */
const getFullProfileById = async (userId: string): Promise<FullUserProfile | null> => {
  if (!userId) {
    return null
  }

  const res = await db
    .select({
      // User basic info
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      // Profile info
      userProfileId: schema.userProfile.id,
      bio: schema.userProfile.bio,
      schoolYear: schema.userProfile.schoolYear,
      graduationYear: schema.userProfile.graduationYear,

      // School and major info
      schoolName: schema.school.name,
      majorName: schema.major.name,

      // Cal.com integration
      calcomUserId: schema.calcomToken.calcomUserId,
      calcomUsername: schema.calcomToken.calcomUsername,
    })
    .from(schema.user)
    .leftJoin(schema.userProfile, eq(schema.user.id, schema.userProfile.userId))
    .leftJoin(schema.userSchool, eq(schema.user.id, schema.userSchool.userId))
    .leftJoin(schema.school, eq(schema.userSchool.schoolId, schema.school.id))
    .leftJoin(schema.userMajor, eq(schema.user.id, schema.userMajor.userId))
    .leftJoin(schema.major, eq(schema.userMajor.majorId, schema.major.id))
    .leftJoin(schema.calcomToken, eq(schema.user.id, schema.calcomToken.userId))
    .where(eq(schema.user.id, userId))
    .limit(1)

  const userData = res[0]

  if (!userData) {
    return null
  }

  return {
    userId: userData.id,
    userProfileId: userData.userProfileId ?? 0,
    username: userData.username,
    email: userData.email,
    emailVerified: !!userData.emailVerified,
    bio: userData.bio,
    schoolYear: userData.schoolYear ?? 'Freshman',
    graduationYear: userData.graduationYear ?? new Date().getFullYear(),
    image: userData.image,
    name: userData.name,
    school: userData.schoolName,
    major: userData.majorName,
    calcomUserId: userData.calcomUserId,
    calcomUsername: userData.calcomUsername,
  }
}

/**
 * Get full profile by user ID (cached)
 */
export const getFullProfileByUserId = cache(getFullProfileById)

/**
 * Get full profile for current mentor (cached)
 * Protected by mentor permission (data access layer)
 */
export const getFullProfile = cache(async (): Promise<FullUserProfile | null> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const userId = user.id
  const profile = await getFullProfileById(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found')
  }
  return profile
})

/**
 * Get user ID for current mentor
 * Protected by mentor permission (data access layer)
 */
export const getUserId = async (): Promise<string> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const userId = user.id
  return userId
}

/**
 * Get public profile by username (no auth required)
 * Used for public mentor profile pages
 */
export interface PublicMentorProfile extends FullUserProfile {
  schoolEmailVerified: boolean
}

export const getPublicProfileByUsername = cache(
  async (username: string): Promise<PublicMentorProfile | null> => {
    const [userData] = await db
      .selectDistinct({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        userProfileId: schema.userProfile.id,
        bio: schema.userProfile.bio,
        schoolYear: schema.userProfile.schoolYear,
        graduationYear: schema.userProfile.graduationYear,
        schoolName: schema.school.name,
        schoolDomainPrefix: schema.school.domainPrefix,
        majorName: schema.major.name,
        calcomUserId: schema.calcomToken.calcomUserId,
        calcomUsername: schema.calcomToken.calcomUsername,
      })
      .from(schema.user)
      .innerJoin(schema.userProfile, eq(schema.user.id, schema.userProfile.userId))
      .innerJoin(schema.post, eq(schema.user.id, schema.post.createdById))
      .leftJoin(
        schema.userSchool,
        and(
          eq(schema.user.id, schema.userSchool.userId),
          isNull(schema.userSchool.deletedAt),
          eq(
            schema.userSchool.id,
            sql`(SELECT id FROM ${schema.userSchool} WHERE user_id = ${schema.user.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
          )
        )
      )
      .leftJoin(schema.school, eq(schema.userSchool.schoolId, schema.school.id))
      .leftJoin(
        schema.userMajor,
        and(
          eq(schema.user.id, schema.userMajor.userId),
          isNull(schema.userMajor.deletedAt),
          eq(
            schema.userMajor.id,
            sql`(SELECT id FROM ${schema.userMajor} WHERE user_id = ${schema.user.id} AND deleted_at IS NULL ORDER BY id LIMIT 1)`
          )
        )
      )
      .leftJoin(schema.major, eq(schema.userMajor.majorId, schema.major.id))
      .leftJoin(schema.calcomToken, eq(schema.user.id, schema.calcomToken.userId))
      .where(and(eq(schema.user.username, username), ...getActivePostConditions()))
      .limit(1)

    if (!userData) return null

    return {
      userId: userData.id,
      userProfileId: userData.userProfileId,
      username: userData.username,
      email: null,
      emailVerified: userData.emailVerified,
      schoolEmailVerified: hasVerifiedSchoolEmail({
        email: userData.email,
        emailVerified: userData.emailVerified,
        schoolDomainPrefix: userData.schoolDomainPrefix,
      }),
      bio: userData.bio,
      schoolYear: userData.schoolYear,
      graduationYear: userData.graduationYear,
      image: userData.image,
      name: userData.name,
      school: userData.schoolName,
      major: userData.majorName,
      calcomUserId: userData.calcomUserId,
      calcomUsername: userData.calcomUsername,
    }
  }
)
