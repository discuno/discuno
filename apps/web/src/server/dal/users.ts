import 'server-only'

import { eq } from 'drizzle-orm'
import { NotFoundError } from '~/lib/errors'
import type { UpdateUser } from '~/lib/schemas/db'
import { updateUserSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { user } from '~/server/db/schema/index'

/**
 * Data Access Layer for users table
 * Raw database operations with no caching or auth checks
 */

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1)

  return u ?? null
}

/**
 * Get user image URL by ID
 */
export const getUserImageById = async (userId: string): Promise<string | null> => {
  const [u] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1)

  return u?.image ?? null
}

/**
 * Update user fields
 */
export const updateUser = async (userId: string, data: UpdateUser): Promise<void> => {
  const validData = updateUserSchema.parse(data)

  const result = await db
    .update(user)
    .set(validData)
    .where(eq(user.id, userId))
    .returning({ id: user.id })

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
    .update(user)
    .set(validData)
    .where(eq(user.id, userId))
    .returning({ id: user.id })

  if (result.length === 0) {
    throw new NotFoundError('User not found')
  }
}

/**
 * Remove user's profile image
 */
export const removeUserImage = async (userId: string): Promise<void> => {
  const result = await db
    .update(user)
    .set({ image: null })
    .where(eq(user.id, userId))
    .returning({ id: user.id })

  if (result.length === 0) {
    throw new NotFoundError('User not found')
  }
}

/**
 * Get user by username
 */
export const getUserByUsername = async (username: string) => {
  return await db.query.user.findFirst({
    where: eq(user.username, username),
  })
}
