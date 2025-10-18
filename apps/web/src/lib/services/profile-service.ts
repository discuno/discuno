import { z } from 'zod'
import { requireAuth } from '~/lib/auth/auth-utils'
import type { UpdateUser, UpdateUserProfile } from '~/lib/schemas/db'
import { updateCompleteProfileSchema } from '~/lib/schemas/db'
import { updateProfileTimezone, upsertProfile } from '~/server/dal/profiles'
import {
  findMajorByName,
  findSchoolByName,
  replaceUserMajors,
  replaceUserSchools,
} from '~/server/dal/schools'
import { getUserImageById, removeUserImage, updateUser, updateUserImage } from '~/server/dal/users'
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
  const { id: userId } = await requireAuth()

  await db.transaction(async () => {
    // 1. Update user basic info
    if (validData.name) {
      await updateUser(userId, { name: validData.name })
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
  const { id: userId } = await requireAuth()

  await updateProfileTimezone(userId, parsedTimezone)
}

/**
 * Get current user's image URL
 */
export const getUserImageUrl = async (): Promise<string | null> => {
  const { id: userId } = await requireAuth()
  return getUserImageById(userId)
}

/**
 * Update user's profile image
 */
export const updateProfileImage = async (imageUrl: string): Promise<void> => {
  const { id: userId } = await requireAuth()
  await updateUserImage(userId, imageUrl)
}

/**
 * Remove user's profile image
 */
export const removeProfileImage = async (): Promise<void> => {
  const { id: userId } = await requireAuth()
  await removeUserImage(userId)
}
