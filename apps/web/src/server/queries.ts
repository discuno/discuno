import { and, desc, eq, isNotNull, lt } from 'drizzle-orm'
import { cache } from 'react'
import 'server-only'
import { z } from 'zod'
import type { CalcomTokenWithId, Card, FullUserProfile, UserProfile } from '~/app/types'
import { getAuthSession, requireAuth } from '~/lib/auth/auth-utils'
import { InternalServerError, NotFoundError } from '~/lib/errors'
import { db } from '~/server/db'
import {
  bookingAttendees,
  bookingOrganizers,
  bookings,
  calcomTokens,
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

type PostQueryResult = {
  post: {
    id: number
    name: string | null
    description: string | null
    createdById: string
    createdAt: Date
  }
  creator: {
    image: string | null
  } | null
  profile: {
    graduationYear: number | null
    schoolYear: string | null
  } | null
  school: {
    name: string | null
  } | null
  major: {
    name: string | null
  } | null
}

const transformPostResult = (result: PostQueryResult[]): Card[] => {
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

export const getMentorCalcomTokens = cache(async (): Promise<CalcomTokenWithId | null> => {
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

export const getUserId = async (): Promise<string> => {
  const { id: userId } = await requireAuth()
  return userId
}

// Internal core function
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

export const getFullProfileByUserId = cache(getFullProfileById)

export const getFullProfile = cache(async (): Promise<FullUserProfile | null> => {
  const { id: userId } = await requireAuth()
  const profile = await getFullProfileById(userId)
  if (!profile) {
    throw new NotFoundError('Profile not found')
  }
  return profile
})

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
const findOrCreateSchoolInternal = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  schoolName: string
): Promise<number> => {
  // First try to find existing school
  const existingSchool = await tx
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, schoolName))
    .limit(1)

  if (existingSchool.length > 0 && existingSchool[0]) {
    return existingSchool[0].id
  }

  // Create new school if not found
  const [newSchool] = await tx
    .insert(schools)
    .values({
      name: schoolName,
      domain: schoolName.toLowerCase().replace(/\s+/g, '') + '.edu',
      location: 'Unknown',
      image: null,
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
 * Find or create a school by name (within a transaction)
 */
export const findOrCreateSchool = async (schoolName: string): Promise<number> => {
  return await db.transaction(async tx => {
    return await findOrCreateSchoolInternal(tx, schoolName)
  })
}

/**
 * Find or create a major by name (within a transaction)
 */
const findOrCreateMajor = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  majorName: string
): Promise<number> => {
  // First try to find existing major
  const existingMajor = await tx
    .select({ id: majors.id })
    .from(majors)
    .where(eq(majors.name, majorName))
    .limit(1)

  if (existingMajor.length > 0 && existingMajor[0]) {
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
 * Update a complete user profile with all fields
 */
export const updateCompleteProfile = async (data: {
  name?: string
  bio?: string | null
  schoolYear?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear?: number
  school?: string
  major?: string
}): Promise<void> => {
  const validData = updateCompleteProfileSchema.parse(data)

  const { id: userId } = await requireAuth()

  await db.transaction(async tx => {
    // 1. Update user basic info
    if (validData.name) {
      await tx
        .update(users)
        .set({
          name: validData.name,
        })
        .where(eq(users.id, userId))
    }

    // 2. Update user profile
    if (validData.bio !== undefined || validData.schoolYear || validData.graduationYear) {
      await tx
        .insert(userProfiles)
        .values({
          userId,
          bio: validData.bio,
          schoolYear: validData.schoolYear ?? 'Freshman',
          graduationYear: validData.graduationYear ?? new Date().getFullYear(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            bio: validData.bio,
            schoolYear: validData.schoolYear ?? 'Freshman',
            graduationYear: validData.graduationYear ?? new Date().getFullYear(),
            updatedAt: new Date(),
          },
        })
    }

    // 3. Handle school relationship
    if (validData.school) {
      const schoolId = await findOrCreateSchoolInternal(tx, validData.school)

      // Remove existing school associations
      await tx.delete(userSchools).where(eq(userSchools.userId, userId))

      // Add new school association
      await tx.insert(userSchools).values({
        userId: userId,
        schoolId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // 4. Handle major relationship
    if (validData.major) {
      const majorId = await findOrCreateMajor(tx, validData.major)

      // Remove existing major associations
      await tx.delete(userMajors).where(eq(userMajors.userId, userId))

      // Add new major association
      await tx.insert(userMajors).values({
        userId,
        majorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  })
}

// Mentor Event Types Queries

const mentorEventTypeSchema = z.object({
  userId: z.string().min(1),
  calcomEventTypeId: z.number().int().positive(),
  isEnabled: z.boolean(),
  customPrice: z.number().int().positive().optional(),
  currency: z.string().length(3).default('USD'),
  title: z.string(),
  description: z.string().nullable(),
  duration: z.number().int().positive(),
})

const mentorStripeAccountSchema = z.object({
  userId: z.string().min(1),
  stripeAccountId: z.string().min(1),
  stripeAccountStatus: z.enum(['pending', 'active', 'restricted', 'inactive']),
  onboardingCompleted: z.date().optional(),
  payoutsEnabled: z.boolean().default(false),
  chargesEnabled: z.boolean().default(false),
  detailsSubmitted: z.boolean().optional(),
  requirements: z.record(z.unknown()).optional(), // Stripe requirements object
})

/**
 * Get mentor's event type preferences with details (using joins)
 */
export const getMentorEventTypes = cache(
  async (): Promise<
    Array<{
      id: number
      calcomEventTypeId: number | null
      title: string
      description: string | null
      duration: number
      isEnabled: boolean
      customPrice: number | null
      currency: string
      createdAt: Date
      updatedAt: Date | null
    }>
  > => {
    const { id: currentUserId } = await requireAuth()

    // Get mentor event types with individual event type IDs
    const result = await db
      .select({
        id: mentorEventTypes.id,
        calcomEventTypeId: mentorEventTypes.calcomEventTypeId,
        title: mentorEventTypes.title,
        description: mentorEventTypes.description,
        duration: mentorEventTypes.duration,
        isEnabled: mentorEventTypes.isEnabled,
        customPrice: mentorEventTypes.customPrice,
        currency: mentorEventTypes.currency,
        createdAt: mentorEventTypes.createdAt,
        updatedAt: mentorEventTypes.updatedAt,
      })
      .from(mentorEventTypes)
      .where(eq(mentorEventTypes.mentorUserId, currentUserId))

    console.log('getMentorEventTypes result:', result)

    return result
      .filter(item => item.calcomEventTypeId !== null)
      .map(item => ({
        ...item,
        calcomEventTypeId: item.calcomEventTypeId as number,
        isEnabled: item.isEnabled,
      }))
  }
)

/**
 * Upsert mentor event type preference
 */
export const upsertMentorEventType = async (data: {
  userId: string
  calcomEventTypeId: number
  isEnabled: boolean
  customPrice?: number
  currency?: string
  title: string
  description: string | null
  duration: number
}): Promise<void> => {
  const validData = mentorEventTypeSchema.parse(data)

  await db
    .insert(mentorEventTypes)
    .values({
      mentorUserId: validData.userId,
      calcomEventTypeId: validData.calcomEventTypeId,
      isEnabled: validData.isEnabled,
      customPrice: validData.customPrice,
      currency: validData.currency,
      title: validData.title,
      description: validData.description,
      duration: validData.duration,
    })
    .onConflictDoUpdate({
      target: [mentorEventTypes.calcomEventTypeId],
      set: {
        isEnabled: validData.isEnabled,
        customPrice: validData.customPrice,
        currency: validData.currency,
        title: validData.title,
        description: validData.description,
        duration: validData.duration,
        updatedAt: new Date(),
      },
    })
}

/**
 * Get mentor's enabled event types for booking page (with joins)
 */
export const getMentorEnabledEventTypes = cache(
  async (
    userId: string
  ): Promise<
    Array<{
      calcomEventTypeId: number
      title: string
      description: string | null
      duration: number
      customPrice: number | null
      currency: string
    }>
  > => {
    const result = await db
      .select({
        calcomEventTypeId: mentorEventTypes.calcomEventTypeId, // Use individual event type ID
        title: mentorEventTypes.title,
        description: mentorEventTypes.description,
        duration: mentorEventTypes.duration,
        customPrice: mentorEventTypes.customPrice,
        currency: mentorEventTypes.currency,
      })
      .from(mentorEventTypes)
      .where(
        and(
          eq(mentorEventTypes.mentorUserId, userId),
          eq(mentorEventTypes.isEnabled, true),
          isNotNull(mentorEventTypes.calcomEventTypeId) // Only return mentors with individual event type IDs
        )
      )

    console.log('getMentorEnabledEventTypes result:', result)

    return result
      .filter(
        (item): item is typeof item & { calcomEventTypeId: number } =>
          item.calcomEventTypeId !== null
      )
      .map(item => ({
        ...item,
      }))
  }
)

// Mentor Stripe Account Queries

/**
 * Get mentor's Stripe account information
 */
export const getMentorStripeAccount = cache(
  async (): Promise<{
    id: number
    stripeAccountId: string
    stripeAccountStatus: 'pending' | 'active' | 'restricted' | 'inactive'
    onboardingCompleted: Date | null
    payoutsEnabled: boolean
    chargesEnabled: boolean
    detailsSubmitted: boolean
    requirements: object
    createdAt: Date
    updatedAt: Date | null
  } | null> => {
    const { id: currentUserId } = await requireAuth()

    const result = await db
      .select({
        id: mentorStripeAccounts.id,
        stripeAccountId: mentorStripeAccounts.stripeAccountId,
        stripeAccountStatus: mentorStripeAccounts.stripeAccountStatus,
        onboardingCompleted: mentorStripeAccounts.onboardingCompleted,
        payoutsEnabled: mentorStripeAccounts.payoutsEnabled,
        chargesEnabled: mentorStripeAccounts.chargesEnabled,
        detailsSubmitted: mentorStripeAccounts.detailsSubmitted,
        requirements: mentorStripeAccounts.requirements,
        createdAt: mentorStripeAccounts.createdAt,
        updatedAt: mentorStripeAccounts.updatedAt,
      })
      .from(mentorStripeAccounts)
      .where(eq(mentorStripeAccounts.userId, currentUserId))
      .limit(1)

    const account = result[0]
    if (!account) return null

    return {
      ...account,
      stripeAccountStatus: account.stripeAccountStatus ?? 'pending',
      payoutsEnabled: account.payoutsEnabled,
      chargesEnabled: account.chargesEnabled,
      detailsSubmitted: account.detailsSubmitted,
      requirements: (account.requirements ?? {}) as object,
    }
  }
)

/**
 * Upsert mentor Stripe account
 */
export const upsertMentorStripeAccount = async (data: {
  userId: string
  stripeAccountId: string
  stripeAccountStatus: 'pending' | 'active' | 'restricted' | 'inactive'
  onboardingCompleted?: Date
  payoutsEnabled?: boolean
  chargesEnabled?: boolean
  detailsSubmitted?: boolean
  requirements?: Record<string, unknown>
}): Promise<void> => {
  const validData = mentorStripeAccountSchema.parse(data)

  await db
    .insert(mentorStripeAccounts)
    .values({
      userId: validData.userId,
      stripeAccountId: validData.stripeAccountId,
      stripeAccountStatus: validData.stripeAccountStatus,
      onboardingCompleted: validData.onboardingCompleted,
      payoutsEnabled: validData.payoutsEnabled,
      chargesEnabled: validData.chargesEnabled,
      detailsSubmitted: validData.detailsSubmitted,
      requirements: validData.requirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: mentorStripeAccounts.userId,
      set: {
        stripeAccountStatus: validData.stripeAccountStatus,
        onboardingCompleted: validData.onboardingCompleted,
        payoutsEnabled: validData.payoutsEnabled,
        chargesEnabled: validData.chargesEnabled,
        detailsSubmitted: validData.detailsSubmitted,
        requirements: validData.requirements,
        updatedAt: new Date(),
      },
    })
}

const timezoneSchema = z
  .string()
  .min(1, 'Timezone must be a non-empty string')
  .max(100, 'Timezone must be less than 100 characters')

export const getOrCreateUserTimezone = async (timezone: string): Promise<void> => {
  const parsedTimezone = timezoneSchema.parse(timezone)

  const { id: userId } = await requireAuth()

  const current = await db
    .select({ timezone: userProfiles.timezone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)
    .then(rows => rows[0])

  if (current?.timezone !== parsedTimezone && current?.timezone === 'UTC') {
    await db
      .update(userProfiles)
      .set({ timezone: parsedTimezone })
      .where(eq(userProfiles.userId, userId))
      .execute()
  }
}

// Booking Queries

/**
 * Get all bookings for a mentor
 */
export const getMentorBookings = cache(async (mentorId: string) => {
  const result = await db
    .select({
      id: bookings.id,
      calcomBookingId: bookings.calcomBookingId,
      calcomUid: bookings.calcomUid,
      title: bookings.title,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      attendeeName: bookingAttendees.name,
      attendeeEmail: bookingAttendees.email,
      attendeeTimeZone: bookingAttendees.timeZone,
      price: bookings.price,
      currency: bookings.currency,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(bookingAttendees, eq(bookings.id, bookingAttendees.bookingId))
    .innerJoin(bookingOrganizers, eq(bookings.id, bookingOrganizers.bookingId))
    .where(eq(bookingOrganizers.userId, mentorId))
    .orderBy(desc(bookings.startTime))

  return result
})

/**
 * Helper function to create local booking record
 */
export const createLocalBooking = async (input: {
  calcomBookingId: number
  calcomUid: string
  title: string
  startTime: Date
  duration: number
  organizerUserId: string
  calcomOrganizerName: string
  calcomOrganizerEmail: string
  calcomOrganizerUsername: string
  attendeeName: string
  attendeeEmail: string
  attendeeTimeZone: string
  attendeeUserId?: string
  price: number
  currency: string
  calcomEventTypeId: number
  paymentId?: number
  requiresPayment: boolean
}) => {
  const endTime = new Date(input.startTime.getTime() + input.duration * 60000)

  return await db.transaction(async tx => {
    // Look up the internal mentor event type ID from the Cal.com event type ID
    const mentorEventType = await tx.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.calcomEventTypeId, input.calcomEventTypeId),
    })

    if (!mentorEventType) {
      throw new NotFoundError(
        `Mentor event type with Cal.com ID ${input.calcomEventTypeId} not found`
      )
    }

    // Create the booking record
    const booking = await tx
      .insert(bookings)
      .values({
        calcomBookingId: input.calcomBookingId,
        calcomUid: input.calcomUid,
        title: input.title,
        startTime: input.startTime,
        endTime,
        status: 'ACCEPTED',
        price: input.price,
        currency: input.currency,
        mentorEventTypeId: mentorEventType.id,
        paymentId: input.paymentId,
        requiresPayment: input.requiresPayment,
        webhookPayload: {},
      })
      .returning()

    if (!booking[0]) {
      throw new Error(
        `Failed to create booking record for calcomBookingId: ${input.calcomBookingId}, calcomUid: ${input.calcomUid}, title: ${input.title}`
      )
    }

    // Create the organizer record
    await tx.insert(bookingOrganizers).values({
      bookingId: booking[0].id,
      userId: input.organizerUserId,
      name: input.calcomOrganizerName,
      email: input.calcomOrganizerEmail,
      username: input.calcomOrganizerUsername,
    })

    // Create the attendee record
    await tx.insert(bookingAttendees).values({
      bookingId: booking[0].id,
      userId: input.attendeeUserId ?? null, // User ID used for logged in mentees
      name: input.attendeeName,
      email: input.attendeeEmail,
      timeZone: input.attendeeTimeZone,
    })

    return booking[0]
  })
}
