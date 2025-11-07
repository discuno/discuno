import 'server-only'

import { eq } from 'drizzle-orm'
import type { UpdateUserProfile } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { userProfile } from '~/server/db/schema/index'

/**
 * Data Access Layer for user_profiles table
 * Raw database operations with no caching or auth checks
 */

/**
 * Get user profile by user ID
 */
export const getProfileByUserId = async (userId: string) => {
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
  })

  return profile ?? null
}

/**
 * Upsert user profile (insert or update)
 */
export const upsertProfile = async (
  userId: string,
  data: Partial<UpdateUserProfile>
): Promise<void> => {
  await db
    .insert(userProfile)
    .values({
      userId,
      bio: data.bio,
      schoolYear: data.schoolYear ?? 'Freshman',
      graduationYear: data.graduationYear ?? new Date().getFullYear(),
      timezone: data.timezone,
    })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        bio: data.bio,
        schoolYear: data.schoolYear ?? 'Freshman',
        graduationYear: data.graduationYear ?? new Date().getFullYear(),
        timezone: data.timezone,
        updatedAt: new Date(),
      },
    })
}

/**
 * Update user timezone
 */
export const updateProfileTimezone = async (userId: string, timezone: string): Promise<void> => {
  const current = await db
    .select({ timezone: userProfile.timezone })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1)
    .then(rows => rows[0])

  // Only update if current timezone is UTC (default) or doesn't exist
  if (current?.timezone !== timezone && current?.timezone === 'UTC') {
    await db.update(userProfile).set({ timezone }).where(eq(userProfile.userId, userId))
  }
}
