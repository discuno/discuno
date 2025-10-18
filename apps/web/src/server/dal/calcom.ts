import 'server-only'

import { eq } from 'drizzle-orm'
import { InternalServerError } from '~/lib/errors'
import type { NewCalcomToken, UpdateCalcomToken } from '~/lib/schemas/db'
import { insertCalcomTokenSchema, updateCalcomTokenSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { calcomTokens } from '~/server/db/schema'

/**
 * Data Access Layer for Cal.com tokens
 * Raw database operations with no caching or auth checks
 */

/**
 * Get Cal.com tokens by user ID
 */
export const getTokensByUserId = async (userId: string) => {
  const tokens = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.userId, userId),
  })

  return tokens ?? null
}

/**
 * Get Cal.com username and user ID by user ID
 */
export const getUsernameByUserId = async (
  userId: string
): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
  const [row] = await db
    .select({
      calcomUsername: calcomTokens.calcomUsername,
      calcomUserId: calcomTokens.calcomUserId,
    })
    .from(calcomTokens)
    .where(eq(calcomTokens.userId, userId))
    .limit(1)

  if (!row?.calcomUsername) return null
  return { calcomUsername: row.calcomUsername, calcomUserId: row.calcomUserId }
}

/**
 * Get Cal.com tokens by username
 */
export const getTokensByUsername = async (username: string) => {
  const tokens = await db.query.calcomTokens.findFirst({
    where: eq(calcomTokens.calcomUsername, username),
  })

  return tokens ?? null
}

/**
 * Store Cal.com tokens (upsert - insert or update if exists)
 */
export const storeTokens = async (data: NewCalcomToken): Promise<void> => {
  const validData = insertCalcomTokenSchema.parse(data)

  const accessExpiry = new Date(validData.accessTokenExpiresAt)
  const refreshExpiry = new Date(validData.refreshTokenExpiresAt)

  const res = await db
    .insert(calcomTokens)
    .values({
      ...validData,
      userId: validData.userId,
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

/**
 * Update Cal.com tokens by user ID
 */
export const updateTokens = async (userId: string, data: UpdateCalcomToken): Promise<void> => {
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

/**
 * Get user ID by Cal.com user ID
 */
export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  const [result] = await db
    .select({
      userId: calcomTokens.userId,
    })
    .from(calcomTokens)
    .where(eq(calcomTokens.calcomUserId, calcomUserId))
    .limit(1)

  return result?.userId ?? null
}
