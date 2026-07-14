import 'server-only'

import { eq } from 'drizzle-orm'
import { InternalServerError } from '~/lib/errors'
import type { NewCalcomToken } from '~/lib/schemas/db'
import { insertCalcomTokenSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { calcomToken } from '~/server/db/schema/index'

export type CalcomConnection = {
  userId: string
  calcomUserId: number
  calcomUsername: string
}

export const getConnectionByUserId = async (userId: string): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select({
      userId: calcomToken.userId,
      calcomUserId: calcomToken.calcomUserId,
      calcomUsername: calcomToken.calcomUsername,
    })
    .from(calcomToken)
    .where(eq(calcomToken.userId, userId))
    .limit(1)
  return connection ?? null
}

export const getUsernameByUserId = async (
  userId: string
): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
  const connection = await getConnectionByUserId(userId)
  return connection
    ? {
        calcomUsername: connection.calcomUsername,
        calcomUserId: connection.calcomUserId,
      }
    : null
}

export const getConnectionByUsername = async (
  username: string
): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select({
      userId: calcomToken.userId,
      calcomUserId: calcomToken.calcomUserId,
      calcomUsername: calcomToken.calcomUsername,
    })
    .from(calcomToken)
    .where(eq(calcomToken.calcomUsername, username))
    .limit(1)
  return connection ?? null
}

export const storeCalcomConnection = async (data: NewCalcomToken): Promise<void> => {
  const validData = insertCalcomTokenSchema.parse(data)
  const result = await db
    .insert(calcomToken)
    .values(validData)
    .onConflictDoUpdate({
      target: calcomToken.userId,
      set: {
        calcomUserId: validData.calcomUserId,
        calcomUsername: validData.calcomUsername,
        accessToken: validData.accessToken,
        refreshToken: validData.refreshToken,
        accessTokenExpiresAt: validData.accessTokenExpiresAt,
        refreshTokenExpiresAt: validData.refreshTokenExpiresAt,
        updatedAt: new Date(),
      },
    })
    .returning({ userId: calcomToken.userId })

  if (result.length === 0) {
    throw new InternalServerError('Failed to store Cal.com connection')
  }
}

export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  const [result] = await db
    .select({ userId: calcomToken.userId })
    .from(calcomToken)
    .where(eq(calcomToken.calcomUserId, calcomUserId))
    .limit(1)
  return result?.userId ?? null
}
