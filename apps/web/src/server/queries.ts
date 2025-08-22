'server only'

import { and, desc, eq, isNotNull, lt } from 'drizzle-orm'
import { cache } from 'react'
import { z } from 'zod'
import type { Card, FullUserProfile } from '~/app/types'
import { getAuthSession, requireAuth } from '~/lib/auth/auth-utils'
import { InternalServerError, NotFoundError } from '~/lib/errors'
import type {
  CalcomToken,
  MentorEventType,
  MentorStripeAccount,
  NewAnalyticsEvent,
  NewBooking,
  NewBookingAttendee,
  NewBookingOrganizer,
  NewCalcomToken,
  NewMentorEventType,
  NewMentorReview,
  NewMentorStripeAccount,
  UpdateCalcomToken,
  UpdateUser,
  UpdateUserProfile,
  UserProfile,
} from '~/lib/schemas/db'
import {
  insertAnalyticsEventSchema,
  insertCalcomTokenSchema,
  insertMentorEventTypeSchema,
  insertMentorReviewSchema,
  insertMentorStripeAccountSchema,
  selectMajorSchema,
  selectSchoolSchema,
  updateCalcomTokenSchema,
  updateCompleteProfileSchema,
  updateUserSchema,
} from '~/lib/schemas/db'
import { db } from '~/server/db'
import {
  analyticsEvents,
  bookingAttendees,
  bookingOrganizers,
  bookings,
  calcomTokens,
  majors,
  mentorEventTypes,
  mentorReviews,
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
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
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

type PostQueryResult = Awaited<ReturnType<typeof buildPostsQuery>>[number]

const transformPostResult = (result: PostQueryResult[]): Card[] => {
  // Transform raw query result to Card format, deduplicating by post.id (e.g., multiple majors)
  const postMap = new Map<number, Card>()
  for (const { post, creator, profile, school, major } of result) {
    if (!postMap.has(post.id)) {
      postMap.set(post.id, {
        ...post,
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
    .orderBy(desc(userProfiles.rankingScore), desc(posts.createdAt))
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

  const post = await buildPostsQuery().where(eq(posts.id, validId)).limit(1)

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
    label: school.name,
    value: school.name.toLowerCase(),
    id: school.id,
  }))
})

export const getMajors = cache(async () => {
  const majors = await db.query.majors.findMany()
  return majors.map(major => ({
    label: major.name,
    value: major.name.toLowerCase(),
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
    .orderBy(desc(userProfiles.rankingScore), desc(posts.createdAt))
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
export const storeCalcomTokensForUser = async (
  userId: string,
  data: NewCalcomToken
): Promise<void> => {
  const validData = insertCalcomTokenSchema.parse(data)

  const accessExpiry = new Date(validData.accessTokenExpiresAt)
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

  const res = await db
    // Use upsert pattern - insert or update if userId already exists
    .insert(calcomTokens)
    .values({
      ...validData,
      userId,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
    })
    .onConflictDoUpdate({
      target: calcomTokens.userId,
      set: {
        ...validData,
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

export const updateCalcomTokensByUserId = async (
  userId: string,
  data: UpdateCalcomToken
): Promise<void> => {
  const validData = updateCalcomTokenSchema.parse(data)

  const accessExpiry = new Date(validData.accessTokenExpiresAt ?? '')
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt ?? '')

  const res = await db
    .update(calcomTokens)
    .set({
      ...validData,
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

export const getMentorCalcomTokens = cache(async (): Promise<CalcomToken | null> => {
  const { id: userId } = await requireAuth()

  const tokens = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.userId, userId),
  })

  if (!tokens) {
    throw new NotFoundError('Calcom tokens not found')
  }

  return tokens
})

/**
 * Lightweight Cal.com username lookup by userId
 */
export const getCalcomUsernameByUserId = cache(
  async (userId: string): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
    const rows = await db
      .select({
        calcomUsername: calcomTokens.calcomUsername,
        calcomUserId: calcomTokens.calcomUserId,
      })
      .from(calcomTokens)
      .where(eq(calcomTokens.userId, userId))
      .limit(1)

    const row = rows[0]
    if (!row?.calcomUsername) return null
    return { calcomUsername: row.calcomUsername, calcomUserId: row.calcomUserId }
  }
)

export const getMentorCalcomTokensByUsername = async (
  username: string
): Promise<CalcomToken | null> => {
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

  const validData = updateUserSchema.parse({ image: imageUrl })

  const result = await db
    .update(users)
    .set(validData)
    .where(eq(users.id, userId))
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
 * Find a school by name
 */
export const findSchool = async (schoolName: string): Promise<number | null> => {
  const name = selectSchoolSchema.shape.name.parse(schoolName)
  const school = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, name))
    .limit(1)

  if (school.length > 0 && school[0]) {
    return school[0].id
  }

  return null
}

/**
 * Find or create a major by name (within a transaction)
 */
const findMajor = async (majorName: string): Promise<number | null> => {
  const name = selectMajorSchema.shape.name.parse(majorName)

  const major = await db
    .select({ id: majors.id })
    .from(majors)
    .where(eq(majors.name, name))
    .limit(1)

  if (major.length > 0 && major[0]) {
    return major[0].id
  }

  return null
}

/**
 * Update a complete user profile with all fields
 */
export const updateCompleteProfile = async (
  data: UpdateUserProfile & UpdateUser & { school?: string; major?: string }
): Promise<void> => {
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
      const schoolId = await findSchool(validData.school)
      if (schoolId) {
        // Remove existing school associations
        await tx.delete(userSchools).where(eq(userSchools.userId, userId))

        // Add new school association
        await tx.insert(userSchools).values({
          userId: userId,
          schoolId,
        })
      }
    }

    // 4. Handle major relationship
    if (validData.major) {
      const majorId = await findMajor(validData.major)
      if (majorId) {
        // Remove existing major associations
        await tx.delete(userMajors).where(eq(userMajors.userId, userId))

        // Add new major association
        await tx.insert(userMajors).values({
          userId,
          majorId,
        })
      }
    }
  })
}

// Mentor Event Types Queries

/**
 * Get mentor's event type preferences with details (using joins)
 */
export const getMentorEventTypes = cache(async (): Promise<MentorEventType[]> => {
  const { id: currentUserId } = await requireAuth()

  // Get mentor event types with individual event type IDs
  const result = await db.query.mentorEventTypes.findMany({
    where: eq(mentorEventTypes.mentorUserId, currentUserId),
  })

  return result
    .filter(
      (item): item is MentorEventType & { calcomEventTypeId: number } =>
        item.calcomEventTypeId !== null
    )
    .map(item => ({
      ...item,
      isEnabled: item.isEnabled,
    }))
})

/**
 * Upsert mentor event type preference
 */
export const upsertMentorEventType = async (data: NewMentorEventType): Promise<void> => {
  const validData = insertMentorEventTypeSchema.parse(data)

  await db
    .insert(mentorEventTypes)
    .values(validData)
    .onConflictDoUpdate({
      target: [mentorEventTypes.calcomEventTypeId],
      set: {
        ...validData,
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
export const getMentorStripeAccount = cache(async (): Promise<MentorStripeAccount | null> => {
  const { id: currentUserId } = await requireAuth()

  const result = await db.query.mentorStripeAccounts.findFirst({
    where: eq(mentorStripeAccounts.userId, currentUserId),
  })

  if (!result) return null

  return {
    ...result,
    stripeAccountStatus: result.stripeAccountStatus ?? 'pending',
    requirements: result.requirements ?? {},
  }
})

/**
 * Upsert mentor Stripe account
 */
export const upsertMentorStripeAccount = async (data: NewMentorStripeAccount): Promise<void> => {
  const validData = insertMentorStripeAccountSchema.parse(data)

  await db
    .insert(mentorStripeAccounts)
    .values(validData)
    .onConflictDoUpdate({
      target: mentorStripeAccounts.userId,
      set: {
        ...validData,
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
type CreateLocalBooking = NewBooking &
  NewBookingAttendee &
  NewBookingOrganizer & {
    duration: number
    calcomEventTypeId: number
  }
export const createLocalBooking = async (input: CreateLocalBooking) => {
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
      userId: input.userId,
      name: input.name,
      email: input.email,
      username: input.username,
    })

    // Create the attendee record
    await tx.insert(bookingAttendees).values({
      bookingId: booking[0].id,
      userId: input.userId,
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      timeZone: input.timeZone,
    })

    return booking[0]
  })
}

export const createMentorReview = async (data: NewMentorReview) => {
  const validatedData = insertMentorReviewSchema.parse(data)
  return await db.insert(mentorReviews).values(validatedData).returning()
}

export const createAnalyticsEvent = async (data: NewAnalyticsEvent) => {
  const validatedData = insertAnalyticsEventSchema.parse(data)
  return await db.insert(analyticsEvents).values(validatedData).returning()
}
