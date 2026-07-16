import { z } from 'zod'
import { requireAuth } from '~/lib/auth/auth-utils'
import { ConflictError } from '~/lib/errors'
import type { UpdateUser, UpdateUserProfile } from '~/lib/schemas/db'
import { updateCompleteProfileSchema } from '~/lib/schemas/db'
import { updateProfileTimezone, upsertProfile } from '~/server/dal/profiles'
import {
  findMajorByName,
  findSchoolByName,
  replaceUserMajors,
  replaceUserSchools,
} from '~/server/dal/schools'
import {
  getUserByUsername,
  getUserImageById,
  removeUserImage,
  updateUser,
  updateUserImage,
} from '~/server/dal/users'
import { db } from '~/server/db'
import { getFullProfile } from '~/server/queries/profiles'

/**
 * Services Layer for profile management
 * Handles complex multi-step profile operations
 */

/**
 * Complete user profile (multi-table update workflow)
 */
export const completeUserProfile = async (
  data: UpdateUserProfile & UpdateUser & { school?: string; major?: string }
) => {
  const validData = updateCompleteProfileSchema.parse(data)
  const { user } = await requireAuth()
  const userId = user.id

  if (validData.username) {
    const existingUser = await getUserByUsername(validData.username)
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError('That username is already taken.')
    }
  }

  try {
    await db.transaction(async () => {
      // 1. Update user basic info
      if (validData.name || validData.username) {
        await updateUser(userId, {
          ...(validData.name ? { name: validData.name } : {}),
          ...(validData.username
            ? { username: validData.username, displayUsername: validData.username }
            : {}),
        })
      }

      // 2. Update user profile
      if (validData.bio !== undefined || validData.schoolYear || validData.graduationYear) {
        await upsertProfile(userId, {
          bio: validData.bio,
          schoolYear: validData.schoolYear ?? 'Freshman',
          graduationYear: validData.graduationYear ?? new Date().getFullYear(),
        })
      }

      // 3. Handle school relationship
      if (validData.school) {
        const schoolId = await findSchoolByName(validData.school)
        if (schoolId) {
          await replaceUserSchools(userId, [schoolId])
        }
      }

      // 4. Handle major relationship
      if (validData.major) {
        const majorId = await findMajorByName(validData.major)
        if (majorId) {
          await replaceUserMajors(userId, [majorId])
        }
      }
    })
  } catch (error) {
    const databaseError = error as { code?: unknown; constraint_name?: unknown }
    if (
      databaseError.code === '23505' &&
      typeof databaseError.constraint_name === 'string' &&
      databaseError.constraint_name.includes('username')
    ) {
      throw new ConflictError('That username is already taken.')
    }
    throw error
  }

  // Return updated profile
  return getFullProfile()
}

/**
 * Update or create user timezone
 */
const timezoneSchema = z
  .string()
  .min(1, 'Timezone must be a non-empty string')
  .max(100, 'Timezone must be less than 100 characters')

export const setUserTimezone = async (timezone: string): Promise<void> => {
  const parsedTimezone = timezoneSchema.parse(timezone)
  const { user } = await requireAuth()
  const userId = user.id

  await updateProfileTimezone(userId, parsedTimezone)
}

/**
 * Get current user's image URL
 */
export const getUserImageUrl = async (): Promise<string | null> => {
  const { user } = await requireAuth()
  const userId = user.id

  return getUserImageById(userId)
}

/**
 * Update user's profile image
 */
export const updateProfileImage = async (imageUrl: string): Promise<void> => {
  const { user } = await requireAuth()
  const userId = user.id
  await updateUserImage(userId, imageUrl)
}

/**
 * Remove user's profile image
 */
export const removeProfileImage = async (): Promise<void> => {
  const { user } = await requireAuth()
  const userId = user.id
  await removeUserImage(userId)
}
