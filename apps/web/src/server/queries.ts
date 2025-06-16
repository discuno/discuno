import { and, desc, eq } from 'drizzle-orm'
import 'server-only'
import type {
  CalcomToken,
  CalcomTokenWithId,
  Card,
  FullUserProfile,
  UserProfile,
  UserProfileWithImage,
} from '~/app/types'
import { requireAuth } from '~/lib/auth/auth-utils'
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

export const getPosts = async (limit = 20, offset = 0): Promise<Card[]> => {
  await requireAuth()

  try {
    const result = await db
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
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)

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
  } catch (err) {
    console.error('Failed to get posts', err)
    throw new Error('Failed to get posts')
  }
}

export const getPostById = async (id: number): Promise<Card> => {
  await requireAuth()

  try {
    const post = await db
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
      .where(eq(posts.id, id))
      .limit(1)
      .execute()

    if (post.length === 0) {
      throw new Error('Post not found')
    }

    const postData = post[0]

    return {
      id: postData?.post.id,
      name: postData?.post.name,
      description: postData?.post.description,
      createdById: postData?.post.createdById,
      createdAt: postData?.post.createdAt,
      userImage: postData?.creator?.image ?? null,
      graduationYear: postData?.profile?.graduationYear ?? null,
      schoolYear: postData?.profile?.schoolYear ?? null,
      school: postData?.school?.name ?? null,
      major: postData?.major?.name ?? null,
    }
  } catch (err) {
    console.error('Error fetching post by ID:', err)
    throw new Error('Failed to fetch post')
  }
}

export const getSchools = async () => {
  await requireAuth()

  try {
    const schools = await db.query.schools.findMany()
    const res: { value: string; label: string; id: number }[] = schools.map(school => ({
      label: school.name ?? 'Unknown',
      value: school.name?.toLowerCase() ?? 'unknown',
      id: school.id,
    }))

    return res
  } catch (err) {
    console.error('Failed to get schools', err)
    throw new Error('Failed to get schools')
  }
}

export const getMajors = async () => {
  await requireAuth()

  try {
    const majors = await db.query.majors.findMany()
    const res: { value: string; label: string; id: number }[] = majors.map(major => ({
      label: major.name ?? 'Unknown',
      value: major.name?.toLowerCase() ?? 'unknown',
      id: major.id,
    }))

    return res
  } catch (err) {
    console.error('Failed to get majors', err)
    throw new Error('Failed to get majors')
  }
}

export const getPostsByFilters = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  offset = 0
): Promise<Card[]> => {
  await requireAuth()

  try {
    // Return all posts if no filters
    if ([schoolId, majorId, graduationYear].every(f => f === -1)) {
      return getPosts(limit, offset)
    }

    const conditions = []

    if (schoolId !== null && schoolId !== -1) {
      conditions.push(eq(schools.id, schoolId))
    }
    if (majorId !== null && majorId !== -1) {
      conditions.push(eq(majors.id, majorId))
    }
    if (graduationYear !== null && graduationYear !== -1) {
      conditions.push(eq(userProfiles.graduationYear, graduationYear))
    }

    const query = db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)

    const result = await query

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
  } catch (err) {
    console.error('Failed to get posts by filters', err)
    throw new Error('Failed to get posts by filters')
  }
}

export const getProfilePic = async (userId: string): Promise<string | null> => {
  await requireAuth()

  try {
    const userImage = await db.query.users.findFirst({
      where: (model, { eq }) => eq(model.id, userId),
      columns: {
        image: true,
      },
    })

    return userImage?.image ?? null
  } catch (err) {
    console.error('Failed to get profile picture', err)
    throw new Error('Failed to get profile picture')
  }
}

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  await requireAuth()

  try {
    const profile = await db.query.userProfiles.findFirst({
      where: (model, { eq }) => eq(model.userId, userId),
    })

    return profile ?? null
  } catch (err) {
    console.error('Failed to get profile', err)
    throw new Error('Failed to get profile')
  }
}

export const getProfileWithImage = async (userId: string): Promise<UserProfileWithImage | null> => {
  await requireAuth()

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

    return profile ?? null
  } catch (err) {
    console.error('Failed to get profile with image', err)
    throw new Error('Failed to get profile with image')
  }
}

export const updateCalcomToken = async (token: CalcomToken, userId: string): Promise<void> => {
  await requireAuth()

  try {
    const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = token

    const res = await db
      .update(calcomTokens)
      .set({
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calcomTokens.userId, userId))

    if (res.length === 0) {
      throw new Error('Failed to update calcom token')
    }
  } catch (err) {
    console.error('Failed to update calcom token', err)
    throw new Error('Failed to update calcom token')
  }
}

export const getCalcomToken = async (accessToken: string): Promise<CalcomTokenWithId | null> => {
  await requireAuth()

  try {
    const tokenRecord = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.accessToken, accessToken),
    })

    return tokenRecord ?? null
  } catch (err) {
    console.error('Failed to get calcom token', err)
    throw new Error('Failed to get calcom token')
  }
}

export const storeCalcomTokens = async ({
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
  await requireAuth()

  try {
    const accessExpiry = new Date(accessTokenExpiresAt)
    const refreshExpiry = new Date(refreshTokenExpiresAt)

    const res = await db.insert(calcomTokens).values({
      userId,
      calcomUserId,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
    })

    if (res.length === 0) {
      throw new Error('Failed to store calcom tokens')
    }
  } catch (err) {
    console.error('Failed to store calcom tokens', err)
    throw new Error('Failed to store calcom tokens')
  }
}

export const getUserCalcomTokens = async (userId: string): Promise<CalcomTokenWithId | null> => {
  await requireAuth()

  try {
    const tokens = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })

    return tokens ?? null
  } catch (err) {
    console.error('Failed to get user calcom tokens', err)
    throw new Error('Failed to get user calcom tokens')
  }
}

export const getUserName = async (userId: string): Promise<string | null> => {
  await requireAuth()

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        name: true,
      },
    })

    return user?.name ?? null
  } catch (err) {
    console.error('Failed to get user name', err)
    throw new Error('Failed to get user name')
  }
}

export const getCalcomUserId = async (userId: string): Promise<number | null> => {
  await requireAuth()

  try {
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })

    return token?.calcomUserId ?? null
  } catch (err) {
    console.error('Failed to get calcom user id', err)
    throw new Error('Failed to get calcom user id')
  }
}

export const updateEduEmail = async (userId: string, eduEmail: string): Promise<void> => {
  await requireAuth()

  try {
    const res = await db
      .update(userProfiles)
      .set({
        eduEmail,
        isEduVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))

    if (res.length === 0) {
      throw new Error('Failed to update edu email')
    }
  } catch (err) {
    console.error('Failed to update edu email', err)
    throw new Error('Failed to update edu email')
  }
}

export const isEduEmailInUse = async (eduEmail: string): Promise<boolean> => {
  await requireAuth()
  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.eduEmail, eduEmail),
    })

    return profile?.isEduVerified ?? false
  } catch (err) {
    console.error('Failed to check if edu email is verified', err)
    throw new Error('Failed to check if edu email is verified')
  }
}

export const getFullProfile = async (userId: string): Promise<FullUserProfile | null> => {
  await requireAuth()

  try {
    const res = await db
      .select({
        // User basic info
        userId: users.id,
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

        // School info
        schoolName: schools.name,
        schoolLocation: schools.location,
        schoolImage: schools.image,

        // Major info
        majorName: majors.name,

        // Cal.com integration status
        hasCalcomIntegration: calcomTokens.id,
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

    if (res.length === 0) {
      return null
    }

    const userData = res[0]
    if (!userData) {
      return null
    }

    return {
      id: userData.userProfileId ?? 0,
      userProfileId: userData.userProfileId ?? 0,
      email: userData.email,
      emailVerified: userData.emailVerified !== null,
      bio: userData.bio,
      schoolYear: userData.schoolYear ?? 'Freshman',
      graduationYear: userData.graduationYear ?? new Date().getFullYear(),
      eduEmail: userData.eduEmail,
      isEduVerified: userData.isEduVerified ?? false,
      image: userData.image,
      name: userData.name,
      school: userData.schoolName,
      major: userData.majorName,
    }
  } catch (err) {
    console.error('Failed to get full profile', err)
    throw new Error('Failed to get full profile')
  }
}
