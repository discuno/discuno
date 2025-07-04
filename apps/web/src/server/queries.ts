import { and, desc, eq, lt } from 'drizzle-orm'
import { cache } from 'react'
import 'server-only'
import { z } from 'zod'
import type { CalcomTokenWithId, Card, FullUserProfile, UserProfile } from '~/app/types'
import { getAuthSession, requireAuth } from '~/lib/auth/auth-utils'
import { BadRequestError, InternalServerError, NotFoundError } from '~/lib/errors'
import { db } from '~/server/db'
import {
  calcomTokens,
  majors,
  posts,
  schools,
  userMajors,
  userProfiles,
  users,
  userSchools,
} from '~/server/db/schema'

// Input validation schemas

const cursorPaginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.number().int().positive().optional(),
})

const postIdSchema = z.object({
  id: z.number().int().positive(),
})

const filterSchema = z.object({
  schoolId: z.number().int().positive().nullable(),
  majorId: z.number().int().positive().nullable(),
  graduationYear: z.number().int().min(1900).max(2100).nullable(),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.number().int().positive().optional(),
})

const calcomStoreTokensSchema = z.object({
  calcomUserId: z.number().int().positive(),
  calcomUsername: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.number().int().positive(),
  refreshTokenExpiresAt: z.number().int().positive(),
})

const calcomUpdateTokensSchema = z.object({
  calcomUserId: z.number().int().positive(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.number().int().positive(),
  refreshTokenExpiresAt: z.number().int().positive(),
})

const updateProfileImageSchema = z.object({
  userId: z.string().min(1),
  imageUrl: z.string().url(),
})

const updateCompleteProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).nullable().optional(),
  schoolYear: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']).optional(),
  graduationYear: z.number().int().min(1900).max(2100).optional(),
  school: z.string().max(255).optional(),
  major: z.string().max(255).optional(),
})

// Shared query builder for posts with all necessary joins
const buildPostsQuery = () => {
  return db
    .select({
      post: {
        id: posts.id,
        name: posts.name,
        description: posts.description,
        createdById: posts.createdById,
        createdAt: posts.createdAt,
      },
      creator: {
        image: users.image,
      },
      profile: {
        graduationYear: userProfiles.graduationYear,
        schoolYear: userProfiles.schoolYear,
      },
      school: {
        name: schools.name,
      },
      major: {
        name: majors.name,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdById, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(userSchools, eq(users.id, userSchools.userId))
    .leftJoin(schools, eq(userSchools.schoolId, schools.id))
    .leftJoin(userMajors, eq(users.id, userMajors.userId))
    .leftJoin(majors, eq(userMajors.majorId, majors.id))
}

const transformPostResult = (result: any[]): Card[] => {
  // Transform raw query result to Card format, deduplicating by post.id (e.g., multiple majors)
  const postMap = new Map<number, Card>()
  for (const { post, creator, profile, school, major } of result) {
    if (!postMap.has(post.id)) {
      postMap.set(post.id, {
        id: post.id,
        name: post.name,
        description: post.description,
        createdById: post.createdById,
        createdAt: post.createdAt,
        userImage: creator?.image ?? null,
        graduationYear: profile?.graduationYear ?? null,
        schoolYear: profile?.schoolYear ?? null,
        school: school?.name ?? null,
        major: major?.name ?? null,
      })
    }
  }
  return Array.from(postMap.values())
}

// Improved cursor-based pagination for better performance
export const getPostsCursor = async (
  limit = 20,
  cursor?: number
): Promise<{
  posts: Card[]
  nextCursor?: number
  hasMore: boolean
}> => {
  const { limit: validLimit, cursor: validCursor } = cursorPaginationSchema.parse({ limit, cursor })

  const result = await buildPostsQuery()
    .where(validCursor ? lt(posts.id, validCursor) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(validLimit + 1) // Fetch one extra to check if there are more

  const hasMore = result.length > validLimit
  const postsData = hasMore ? result.slice(0, -1) : result
  console.log('postsData', postsData)
  const nextCursor = hasMore ? postsData[postsData.length - 1]?.post.id : undefined

  return {
    posts: transformPostResult(postsData),
    nextCursor,
    hasMore,
  }
}

export const getPostById = async (id: number): Promise<Card> => {
  const { id: validId } = postIdSchema.parse({ id })

  const post = await buildPostsQuery().where(eq(posts.id, validId)).limit(1).execute()

  if (post.length === 0) {
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

// Cached functions for frequently accessed static data
export const getSchools = cache(async () => {
  const schools = await db.query.schools.findMany()
  return schools.map(school => ({
    label: school.name ?? 'Unknown',
    value: school.name?.toLowerCase() ?? 'unknown',
    id: school.id,
  }))
})

export const getMajors = cache(async () => {
  const majors = await db.query.majors.findMany()
  return majors.map(major => ({
    label: major.name ?? 'Unknown',
    value: major.name?.toLowerCase() ?? 'unknown',
    id: major.id,
  }))
})

export const getPostsByFilters = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  cursor?: number
): Promise<{
  posts: Card[]
  nextCursor?: number
  hasMore: boolean
}> => {
  const {
    schoolId: validSchoolId,
    majorId: validMajorId,
    graduationYear: validGraduationYear,
    limit: validLimit,
    cursor: validCursor,
  } = filterSchema.parse({
    schoolId,
    majorId,
    graduationYear,
    limit,
    cursor,
  })

  // Return all posts if no filters
  if ([validSchoolId, validMajorId, validGraduationYear].every(f => f === null || f === -1)) {
    return getPostsCursor(validLimit, validCursor)
  }

  const conditions = []

  if (validSchoolId !== null && validSchoolId !== -1) {
    conditions.push(eq(schools.id, validSchoolId))
  }
  if (validMajorId !== null && validMajorId !== -1) {
    conditions.push(eq(majors.id, validMajorId))
  }
  if (validGraduationYear !== null && validGraduationYear !== -1) {
    conditions.push(eq(userProfiles.graduationYear, validGraduationYear))
  }

  // Add cursor condition if provided
  if (validCursor) {
    conditions.push(lt(posts.id, validCursor))
  }

  const query = buildPostsQuery()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(validLimit + 1) // Fetch one extra to check if there are more

  const result = await query

  console.log('getPostsByFilters result', result)
  const hasMore = result.length > validLimit
  const postsData = hasMore ? result.slice(0, -1) : result
  console.log('getPostsByFilters postsData', postsData)
  const nextCursor = hasMore ? postsData[postsData.length - 1]?.post.id : undefined

  return {
    posts: transformPostResult(postsData),
    nextCursor,
    hasMore,
  }
}

export const getProfilePic = cache(async (): Promise<string> => {
  const { id } = await requireAuth()

  const userWithImage = await db.query.users.findFirst({
    where: (model, { eq }) => eq(model.id, id),
    columns: {
      image: true,
    },
  })

  if (!userWithImage?.image) {
    throw new NotFoundError('User image not found')
  }

  return userWithImage.image
})

export const getProfile = cache(
  async (): Promise<{ profile: UserProfile | null; userId: string }> => {
    const { id: userId } = await requireAuth()

    const profile = await db.query.userProfiles.findFirst({
      where: (model, { eq }) => eq(model.userId, userId),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    return { profile, userId }
  }
)

const getProfileWithImage = async (): Promise<{
  profilePic: string | null
} | null> => {
  const session = await getAuthSession()

  if (!session?.id) {
    return null
  }

  // Get user data including image
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
  })

  return {
    profilePic: user?.image ?? null,
  }
}

export const getProfileWithImageCached = cache(getProfileWithImage)

export const storeCalcomTokens = async ({
  calcomUserId,
  calcomUsername,
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
}: {
  calcomUserId: number
  calcomUsername: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}): Promise<void> => {
  const { id: userId } = await requireAuth()

  await storeCalcomTokensForUser({
    userId,
    calcomUserId,
    calcomUsername,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  })
}

/**
 * Store Cal.com tokens for a specific user ID (used during authentication flow)
 */
export const storeCalcomTokensForUser = async ({
  userId,
  calcomUserId,
  calcomUsername,
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
}: {
  userId: string
  calcomUserId: number
  calcomUsername: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}): Promise<void> => {
  const validData = calcomStoreTokensSchema.parse({
    calcomUserId,
    calcomUsername,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  })

  const accessExpiry = new Date(validData.accessTokenExpiresAt)
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

  const res = await db
    // Use upsert pattern - insert or update if userId already exists
    .insert(calcomTokens)
    .values({
      userId: userId,
      calcomUserId: validData.calcomUserId,
      calcomUsername: validData.calcomUsername,
      accessToken: validData.accessToken,
      refreshToken: validData.refreshToken,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: calcomTokens.userId,
      set: {
        calcomUserId: validData.calcomUserId,
        calcomUsername: validData.calcomUsername,
        accessToken: validData.accessToken,
        refreshToken: validData.refreshToken,
        accessTokenExpiresAt: accessExpiry,
        refreshTokenExpiresAt: refreshExpiry,
        updatedAt: new Date(),
      },
    })
    .returning({
      userId: calcomTokens.userId,
    })

  if (res.length === 0) {
    throw new InternalServerError('Failed to store calcom tokens')
  }
}

export const updateCalcomTokens = async ({
  calcomUserId,
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
}: {
  calcomUserId: number
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}): Promise<void> => {
  const { id: userId } = await requireAuth()

  const validData = calcomUpdateTokensSchema.parse({
    calcomUserId,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  })

  const accessExpiry = new Date(validData.accessTokenExpiresAt)
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

  const res = await db
    .update(calcomTokens)
    .set({
      calcomUserId: validData.calcomUserId,
      accessToken: validData.accessToken,
      refreshToken: validData.refreshToken,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
      updatedAt: new Date(),
    })
    .where(eq(calcomTokens.userId, userId))
    .returning({ userId: calcomTokens.userId })

  if (res.length === 0) {
    throw new InternalServerError('Failed to update calcom tokens')
  }
}

export const updateCalcomTokensByUserId = async ({
  userId,
  calcomUserId,
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
}: {
  userId: string
  calcomUserId: number
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}): Promise<void> => {
  const validData = calcomUpdateTokensSchema.parse({
    calcomUserId,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  })

  const accessExpiry = new Date(validData.accessTokenExpiresAt)
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

  const res = await db
    .update(calcomTokens)
    .set({
      calcomUserId: validData.calcomUserId,
      accessToken: validData.accessToken,
      refreshToken: validData.refreshToken,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
      updatedAt: new Date(),
    })
    .where(eq(calcomTokens.userId, userId))
    .returning({ userId: calcomTokens.userId })

  if (res.length === 0) {
    throw new InternalServerError('Failed to update calcom tokens')
  }
}

export const getCalcomToken = async (accessToken: string): Promise<CalcomTokenWithId | null> => {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new BadRequestError('Invalid access token')
  }

  const tokenRecord = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.accessToken, accessToken),
  })

  if (!tokenRecord) {
    throw new NotFoundError('Calcom token not found')
  }

  return tokenRecord
}

export const getUserCalcomTokens = cache(async (): Promise<CalcomTokenWithId | null> => {
  const { id: userId } = await requireAuth()

  const tokens = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.userId, userId),
  })

  if (!tokens) {
    throw new NotFoundError('Calcom tokens not found')
  }

  return tokens
})

export const getMentorCalcomTokensByUsername = async (
  username: string
): Promise<CalcomTokenWithId | null> => {
  const calUser = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.calcomUsername, username),
  })

  if (!calUser) {
    throw new NotFoundError('Calcom user not found')
  }

  return calUser
}

export const getUserName = cache(async (): Promise<string | null> => {
  const { id: userId } = await requireAuth()

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      name: true,
    },
  })

  if (!user?.name) {
    throw new NotFoundError('User name not found')
  }

  return user.name
})

export const getUserId = async (): Promise<string> => {
  const { id: userId } = await requireAuth()
  return userId
}

export const getCalcomUserId = cache(async (): Promise<number | null> => {
  const { id: userId } = await requireAuth()

  const token = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.userId, userId),
  })

  if (!token?.calcomUserId) {
    throw new NotFoundError('Calcom user id not found')
  }

  return token.calcomUserId
})

export const getFullProfile = cache(async (): Promise<FullUserProfile | null> => {
  const { id: userId } = await requireAuth()

  const res = await db
    .select({
      // User basic info
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
    throw new NotFoundError('User not found')
  }

  return {
    id: userData.userProfileId ?? 0,
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
})

export const getFullProfileByUserId = cache(
  async (userId: string): Promise<FullUserProfile | null> => {
    if (!userId) {
      return null
    }

    const res = await db
      .select({
        // User basic info
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

    console.log('res', res)

    const userData = res[0]

    if (!userData) {
      return null
    }

    return {
      id: userData.userProfileId ?? 0,
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
)

// Not used
export const getProfileByUsername = cache(
  async (username: string): Promise<FullUserProfile | null> => {
    if (!username) {
      return null
    }

    const res = await db
      .select({
        // User basic info
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
      .where(eq(users.name, username))
      .limit(1)

    const userData = res[0]

    if (!userData) {
      return null
    }

    return {
      id: userData.userProfileId ?? 0,
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
)

export const getProfileByCalcomUsername = cache(
  async (calcomUsername: string): Promise<FullUserProfile | null> => {
    if (!calcomUsername) {
      return null
    }

    const res = await db
      .select({
        // User basic info
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
      .where(eq(calcomTokens.calcomUsername, calcomUsername))
      .limit(1)

    const userData = res[0]

    if (!userData) {
      return null
    }

    return {
      id: userData.userProfileId ?? 0,
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
)

/**
 * Get current user's profile image URL for checking existing images
 */
export const getCurrentUserImage = async (): Promise<string | null> => {
  const { id: userId } = await requireAuth()

  const [user] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user?.image ?? null
}

/**
 * Update user's profile image URL in database
 */
export const updateUserImage = async (imageUrl: string): Promise<void> => {
  const { id: userId } = await requireAuth()

  const validData = updateProfileImageSchema.parse({ userId, imageUrl })

  const result = await db
    .update(users)
    .set({ image: validData.imageUrl })
    .where(eq(users.id, validData.userId))
    .returning({ id: users.id })

  if (result.length === 0) {
    throw new NotFoundError('User not found')
  }
}

/**
 * Remove user's profile image from database
 */
export const removeUserImage = async (): Promise<void> => {
  const { id: userId } = await requireAuth()

  const result = await db
    .update(users)
    .set({ image: null })
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  if (result.length === 0) {
    throw new NotFoundError('User not found')
  }
}

/**
 * Find or create a school by name (within a transaction)
 */
const findOrCreateSchool = async (tx: any, schoolName: string): Promise<number> => {
  // First try to find existing school
  const existingSchool = await tx
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, schoolName))
    .limit(1)

  if (existingSchool.length > 0) {
    return existingSchool[0].id
  }

  // Create new school if not found
  const [newSchool] = await tx
    .insert(schools)
    .values({
      name: schoolName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schools.id })

  if (!newSchool) {
    throw new InternalServerError('Failed to create school')
  }

  return newSchool.id
}

/**
 * Find or create a major by name (within a transaction)
 */
const findOrCreateMajor = async (tx: any, majorName: string): Promise<number> => {
  // First try to find existing major
  const existingMajor = await tx
    .select({ id: majors.id })
    .from(majors)
    .where(eq(majors.name, majorName))
    .limit(1)

  if (existingMajor.length > 0) {
    return existingMajor[0].id
  }

  // Create new major if not found
  const [newMajor] = await tx
    .insert(majors)
    .values({
      name: majorName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: majors.id })

  if (!newMajor) {
    throw new InternalServerError('Failed to create major')
  }

  return newMajor.id
}

/**
 * Complete profile update with all related tables
 * Handles users, userProfiles, userSchools, and userMajors tables
 */
export const updateCompleteUserProfile = async ({
  name,
  bio,
  schoolYear,
  graduationYear,
  school,
  major,
}: {
  name?: string
  bio?: string | null
  schoolYear?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear?: number
  school?: string
  major?: string
}): Promise<void> => {
  const { id: userId } = await requireAuth()

  const validData = updateCompleteProfileSchema.parse({
    userId,
    name,
    bio,
    schoolYear,
    graduationYear,
    school,
    major,
  })

  try {
    // Use a transaction to ensure data consistency
    await db.transaction(async tx => {
      // 1. Update basic user info if name is provided
      if (validData.name) {
        const userResult = await tx
          .update(users)
          .set({ name: validData.name })
          .where(eq(users.id, validData.userId))
          .returning({ id: users.id })

        if (userResult.length === 0) {
          throw new NotFoundError('User not found')
        }
      }

      // 2. Handle user profile (bio, schoolYear, graduationYear)
      if (validData.bio !== undefined || validData.schoolYear || validData.graduationYear) {
        // Check if profile exists
        const existingProfile = await tx
          .select({ id: userProfiles.id })
          .from(userProfiles)
          .where(eq(userProfiles.userId, validData.userId))
          .limit(1)

        const profileData = {
          ...(validData.bio !== undefined && { bio: validData.bio ?? null }),
          ...(validData.schoolYear && { schoolYear: validData.schoolYear }),
          ...(validData.graduationYear && { graduationYear: validData.graduationYear }),
          updatedAt: new Date(),
        }

        if (existingProfile.length > 0) {
          // Update existing profile
          await tx
            .update(userProfiles)
            .set(profileData)
            .where(eq(userProfiles.userId, validData.userId))
        } else {
          // Create new profile
          await tx.insert(userProfiles).values({
            userId: validData.userId,
            ...profileData,
            // Set required fields with defaults if not provided
            schoolYear: validData.schoolYear ?? 'Freshman',
            graduationYear: validData.graduationYear ?? new Date().getFullYear(),
            createdAt: new Date(),
          })
        }
      }

      // 3. Handle school relationship
      if (validData.school) {
        const schoolId = await findOrCreateSchool(tx, validData.school)

        // Remove existing school associations
        await tx.delete(userSchools).where(eq(userSchools.userId, validData.userId))

        // Add new school association
        await tx.insert(userSchools).values({
          userId: validData.userId,
          schoolId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      // 4. Handle major relationship
      if (validData.major) {
        const majorId = await findOrCreateMajor(tx, validData.major)

        // Remove existing major associations
        await tx.delete(userMajors).where(eq(userMajors.userId, validData.userId))

        // Add new major association
        await tx.insert(userMajors).values({
          userId: validData.userId,
          majorId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    })
  } catch (error) {
    console.error('Error updating complete user profile:', error)
    throw new InternalServerError('Failed to update user profile')
  }
}
