import 'server-only'

import { eq } from 'drizzle-orm'
import type { UpdateUser } from '~/lib/schemas/db'
import { updateUserSchema } from '~/lib/schemas/db'
import { NotFoundError } from '~/lib/errors'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

/**
 * Data Access Layer for users table
 * Raw database operations with no caching or auth checks
 */

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return user ?? null
}

/**
 * Get user image URL by ID
 */
export const getUserImageById = async (userId: string): Promise<string | null> => {
  const [user] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user?.image ?? null
}

/**
 * Update user fields
 */
export const updateUser = async (userId: string, data: UpdateUser): Promise<void> => {
  const validData = updateUserSchema.parse(data)

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
 * Update user's profile image URL
 */
export const updateUserImage = async (userId: string, imageUrl: string): Promise<void> => {
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
 * Remove user's profile image
 */
export const removeUserImage = async (userId: string): Promise<void> => {
  const result = await db
    .update(users)
    .set({ image: null })
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  if (result.length === 0) {
    throw new NotFoundError('User not found')
  }
}
