import { and, desc, eq, lt } from 'drizzle-orm'
import { cache } from 'react'
import 'server-only'
import { z } from 'zod'
import type {
  CalcomToken,
  CalcomTokenWithId,
  Card,
  FullUserProfile,
  UserProfile,
} from '~/app/types'
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  requireAuth,
} from '~/lib/auth/auth-utils'
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

const calcomTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.number().int().positive(),
  refreshTokenExpiresAt: z.number().int().positive(),
})

const calcomStoreTokensSchema = z.object({
  calcomUserId: z.number().int().positive(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.number().int().positive(),
  refreshTokenExpiresAt: z.number().int().positive(),
})

const eduEmailSchema = z.object({
  eduEmail: z.string().email().endsWith('.edu'),
})

// Helper function for secure error logging
const logError = (operation: string, error: unknown, userId?: string) => {
  const errorInfo = {
    operation,
    userId,
    message: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString(),
  }
  console.error('Database operation failed:', errorInfo)
}

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

// Transform raw query result to Card format
const transformPostResult = (result: any[]): Card[] => {
  return result.map(({ post, creator, profile, school, major }) => ({
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
  }))
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
  await requireAuth()

  const { limit: validLimit, cursor: validCursor } = cursorPaginationSchema.parse({ limit, cursor })

  try {
    const result = await buildPostsQuery()
      .where(validCursor ? lt(posts.id, validCursor) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(validLimit + 1) // Fetch one extra to check if there are more

    const hasMore = result.length > validLimit
    const postsData = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore ? postsData[postsData.length - 1]?.post.id : undefined

    return {
      posts: transformPostResult(postsData),
      nextCursor,
      hasMore,
    }
  } catch (err) {
    logError('getPostsCursor', err)
    throw new InternalServerError('Failed to get posts with cursor')
  }
}

export const getPostById = async (id: number): Promise<Card> => {
  const { id: currentUserId } = await requireAuth()
  const { id: validId } = postIdSchema.parse({ id })

  try {
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
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getPostById', err, currentUserId)
    throw new InternalServerError('Failed to fetch post')
  }
}

// Cached functions for frequently accessed static data
export const getSchools = cache(async () => {
  try {
    const schools = await db.query.schools.findMany()
    const res: { value: string; label: string; id: number }[] = schools.map(school => ({
      label: school.name ?? 'Unknown',
      value: school.name?.toLowerCase() ?? 'unknown',
      id: school.id,
    }))

    return res
  } catch (err) {
    logError('getSchools', err)
    throw new InternalServerError('Failed to get schools')
  }
})

export const getMajors = cache(async () => {
  try {
    const majors = await db.query.majors.findMany()
    const res: { value: string; label: string; id: number }[] = majors.map(major => ({
      label: major.name ?? 'Unknown',
      value: major.name?.toLowerCase() ?? 'unknown',
      id: major.id,
    }))

    return res
  } catch (err) {
    logError('getMajors', err)
    throw new InternalServerError('Failed to get majors')
  }
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
  const { id: currentUserId } = await requireAuth()

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

  try {
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

    const hasMore = result.length > validLimit
    const postsData = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore ? postsData[postsData.length - 1]?.post.id : undefined

    return {
      posts: transformPostResult(postsData),
      nextCursor,
      hasMore,
    }
  } catch (err) {
    logError('getPostsByFilters', err, currentUserId)
    throw new InternalServerError('Failed to get posts by filters')
  }
}

export const getProfilePic = cache(async (): Promise<string> => {
  const { id } = await requireAuth()

  try {
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
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getProfilePic', err, id)
    throw new InternalServerError('Failed to get profile picture')
  }
})

export const getProfile = cache(
  async (): Promise<{ profile: UserProfile | null; userId: string }> => {
    const { id: userId } = await requireAuth()

    try {
      const profile = await db.query.userProfiles.findFirst({
        where: (model, { eq }) => eq(model.userId, userId),
      })

      if (!profile) {
        throw new NotFoundError('Profile not found')
      }

      return { profile, userId }
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw err
      }
      logError('getProfile', err, userId)
      throw new InternalServerError('Failed to get profile')
    }
  }
)

const getProfileWithImage = async (): Promise<{
  profilePic: string
  isMentor: boolean
}> => {
  const { id: userId } = await requireAuth()

  try {
    const profile = await db.query.userProfiles.findFirst({
      where: (model, { eq }) => eq(model.userId, userId),
      with: {
        user: {
          columns: {
            image: true,
          },
        },
      },
    })

    if (!profile?.user) {
      throw new NotFoundError('Profile not found')
    }

    return {
      profilePic: profile.user.image ?? '',
      isMentor: profile.isEduVerified,
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getProfileWithImage', err, userId)
    throw new InternalServerError('Failed to get profile with image')
  }
}

export const getProfileWithImageCached = cache(getProfileWithImage)

export const updateCalcomToken = async (token: CalcomToken): Promise<void> => {
  const { id: userId } = await requireAuth()
  const validToken = calcomTokenSchema.parse(token)

  try {
    const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = validToken

    const res = await db
      .update(calcomTokens)
      .set({
        accessToken,
        refreshToken,
        accessTokenExpiresAt: new Date(accessTokenExpiresAt),
        refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
        updatedAt: new Date(),
      })
      .where(eq(calcomTokens.userId, userId))

    if (res.length === 0) {
      throw new InternalServerError('Failed to update calcom token')
    }
  } catch (err) {
    if (err instanceof InternalServerError) {
      throw err
    }
    logError('updateCalcomToken', err, userId)
    throw new InternalServerError('Failed to update calcom token')
  }
}

export const getCalcomToken = async (accessToken: string): Promise<CalcomTokenWithId | null> => {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new BadRequestError('Invalid access token')
  }

  try {
    const tokenRecord = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.accessToken, accessToken),
    })

    if (!tokenRecord) {
      throw new NotFoundError('Calcom token not found')
    }

    return tokenRecord
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      throw err
    }
    logError('getCalcomToken', err)
    throw new InternalServerError('Failed to get calcom token')
  }
}

export const storeCalcomTokens = async ({
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

  const validData = calcomStoreTokensSchema.parse({
    calcomUserId,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  })

  try {
    const accessExpiry = new Date(validData.accessTokenExpiresAt)
    const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

    const res = await db.insert(calcomTokens).values({
      userId: userId,
      calcomUserId: validData.calcomUserId,
      accessToken: validData.accessToken,
      refreshToken: validData.refreshToken,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
    })

    if (res.length === 0) {
      throw new InternalServerError('Failed to store calcom tokens')
    }
  } catch (err) {
    if (err instanceof InternalServerError) {
      throw err
    }
    logError('storeCalcomTokens', err, userId)
    throw new InternalServerError('Failed to store calcom tokens')
  }
}

export const getUserCalcomTokens = cache(async (): Promise<CalcomTokenWithId | null> => {
  const { id: userId } = await requireAuth()

  try {
    const tokens = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })

    if (!tokens) {
      throw new NotFoundError('Calcom tokens not found')
    }

    return tokens
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getUserCalcomTokens', err, userId)
    throw new InternalServerError('Failed to get user calcom tokens')
  }
})

export const getUserName = cache(async (): Promise<string | null> => {
  const { id: userId } = await requireAuth()

  try {
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
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getUserName', err, userId)
    throw new InternalServerError('Failed to get user name')
  }
})

export const getCalcomUserId = cache(async (): Promise<number | null> => {
  const { id: userId } = await requireAuth()

  try {
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })

    if (!token?.calcomUserId) {
      throw new NotFoundError('Calcom user id not found')
    }

    return token.calcomUserId
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getCalcomUserId', err, userId)
    throw new InternalServerError('Failed to get calcom user id')
  }
})

export const updateEduEmail = async (eduEmail: string): Promise<void> => {
  const { id: userId } = await requireAuth()
  const { eduEmail: validEduEmail } = eduEmailSchema.parse({ eduEmail })

  try {
    const res = await db
      .update(userProfiles)
      .set({
        eduEmail: validEduEmail,
        isEduVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))

    if (res.length === 0) {
      throw new NotFoundError('No profile found')
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('updateEduEmail', err, userId)
    throw new InternalServerError('Failed to update edu email')
  }
}

export const isEduEmailInUse = async (eduEmail: string): Promise<boolean> => {
  const { eduEmail: validEduEmail } = eduEmailSchema.parse({ eduEmail })

  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.eduEmail, validEduEmail),
    })

    return profile?.isEduVerified ?? false
  } catch (err) {
    logError('isEduEmailInUse', err)
    throw new InternalServerError('Failed to check if edu email is verified')
  }
}

export const getProfileByEduEmail = async (
  eduEmail: string
): Promise<{ profile: UserProfile; userId: string; userName: string }> => {
  const { id: userId, name: userName } = await requireAuth()
  const { eduEmail: validEduEmail } = eduEmailSchema.parse({ eduEmail })

  if (!userName) {
    throw new BadRequestError('User name is required')
  }

  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.eduEmail, validEduEmail),
    })

    if (!profile) {
      throw new NotFoundError(`Profile with edu email ${validEduEmail} not found`)
    }

    return { profile, userId, userName }
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      throw err
    }
    logError('getProfileByEduEmail', err, userId)
    throw new InternalServerError('Failed to get profile by edu email')
  }
}

export const getFullProfile = cache(async (): Promise<FullUserProfile | null> => {
  const { id: userId } = await requireAuth()

  try {
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
        eduEmail: userProfiles.eduEmail,
        isEduVerified: userProfiles.isEduVerified,

        // School and major info
        schoolName: schools.name,
        majorName: majors.name,

        // Cal.com integration
        calcomUserId: calcomTokens.calcomUserId,
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
      eduEmail: userData.eduEmail,
      isEduVerified: userData.isEduVerified ?? false,
      image: userData.image,
      name: userData.name,
      school: userData.schoolName,
      major: userData.majorName,
      calcomUserId: userData.calcomUserId,
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err
    }
    logError('getFullProfile', err, userId)
    throw new InternalServerError('Failed to get full profile')
  }
})
