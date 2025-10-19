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
import {
  calcomTokens,
  majors,
  schools,
  userMajors,
  userProfiles,
  users,
  userSchools,
} from '~/server/db/schema'

/**
 * Query Layer for profiles
 * Includes caching, joins, transformations, and auth checks
 */

/**
 * Get profile picture URL for current user
 */
export const getProfilePic = cache(async (): Promise<string> => {
  const { id } = await requireAuth()

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
    const { id: userId } = await requireAuth()

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
  const session = await getAuthSession()

  if (!session?.id) {
    return null
  }

  const user = await getUserById(session.id)

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
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,

      // Profile info
      userProfileId: userProfiles.id,
      bio: userProfiles.bio,
      schoolYear: userProfiles.schoolYear,
      graduationYear: userProfiles.graduationYear,

      // School and major info
      schoolName: schools.name,
      majorName: majors.name,

      // Cal.com integration
      calcomUserId: calcomTokens.calcomUserId,
      calcomUsername: calcomTokens.calcomUsername,
      accessToken: calcomTokens.accessToken,
      refreshToken: calcomTokens.refreshToken,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(userSchools, eq(users.id, userSchools.userId))
    .leftJoin(schools, eq(userSchools.schoolId, schools.id))
    .leftJoin(userMajors, eq(users.id, userMajors.userId))
    .leftJoin(majors, eq(userMajors.majorId, majors.id))
    .leftJoin(calcomTokens, eq(users.id, calcomTokens.userId))
    .where(eq(users.id, userId))
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
  const { id: userId } = await requireAuth()
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
  const { id: userId } = await requireAuth()
  return userId
}
