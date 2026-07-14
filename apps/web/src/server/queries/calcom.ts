import 'server-only'

import { cache } from 'react'
import { requirePermission } from '~/lib/auth/auth-utils'
import { NotFoundError } from '~/lib/errors'
import {
  getConnectionByUserId,
  getConnectionByUsername,
  getUsernameByUserId,
  type CalcomConnection,
} from '~/server/dal/calcom'

export const getMentorCalcomConnection = cache(async (): Promise<CalcomConnection> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const connection = await getConnectionByUserId(user.id)
  if (!connection) throw new NotFoundError('Cal.com connection not found')
  return connection
})

export const getCalcomUsernameByUserId = cache(
  async (userId: string): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
    return getUsernameByUserId(userId)
  }
)

export const getCalcomConnectionByUsername = async (
  username: string
): Promise<CalcomConnection> => {
  const connection = await getConnectionByUsername(username)
  if (!connection) throw new NotFoundError('Cal.com user not found')
  return connection
}
