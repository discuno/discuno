import 'server-only'

import { eq } from 'drizzle-orm'
import { cache } from 'react'
import type { FullUserProfile } from '~/app/types'
import { getAuthSession, requireAuth } from '~/lib/auth/auth-utils'
import { NotFoundError } from '~/lib/errors'
import type { UserProfile } from '~/lib/schemas/db'
import { getProfileByUserId } from '~/server/dal/profiles'
import { getUserById, getUserImageById } from '~/server/dal/users'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema'

/**
 * Query Layer for profiles
 * Includes caching, joins, transformations, and auth checks
 */

/**
 * Get profile picture URL for current user
 */
export const getProfilePic = cache(async (): Promise<string> => {
  const { user } = await requireAuth()
  const id = user.id

  const image = await getUserImageById(id)

  if (!image) {
    throw new NotFoundError('User image not found')
  }

  return image
})

/**
 * Get basic profile for current user
 */
export const getProfile = cache(
  async (): Promise<{ profile: UserProfile | null; userId: string }> => {
    const { user } = await requireAuth()
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

  if (!session?.userId) {
    return null
  }

  const user = await getUserById(session.userId)

  return {
    profilePic: user?.image ?? null,
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
      accessToken: schema.calcomToken.accessToken,
      refreshToken: schema.calcomToken.refreshToken,
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
    accessToken: userData.accessToken,
    refreshToken: userData.refreshToken,
  }
}

/**
 * Get full profile by user ID (cached)
 */
export const getFullProfileByUserId = cache(getFullProfileById)

/**
 * Get full profile for current user (cached)
 */
export const getFullProfile = cache(async (): Promise<FullUserProfile | null> => {
  const { user } = await requireAuth()
  const userId = user.id
  const profile = await getFullProfileById(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found')
  }
  return profile
})

/**
 * Get user ID for current user
 */
export const getUserId = async (): Promise<string> => {
  const { user } = await requireAuth()
  const userId = user.id
  return userId
}
