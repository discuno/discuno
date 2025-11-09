import 'server-only'

import { cache } from 'react'
import { requirePermission } from '~/lib/auth/auth-utils'
import { NotFoundError } from '~/lib/errors'
import type { CalcomToken } from '~/lib/schemas/db'
import { getTokensByUserId, getTokensByUsername, getUsernameByUserId } from '~/server/dal/calcom'

/**
 * Query Layer for Cal.com tokens
 *
 * SECURITY: Permission checks enforced here (data access layer)
 * Layouts/actions/services delegate to these functions for protection
 */

/**
 * Get mentor's Cal.com tokens
 * Protected by mentor permission (data access layer)
 */
export const getMentorCalcomTokens = cache(async (): Promise<CalcomToken | null> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const userId = user.id

  const tokens = await getTokensByUserId(userId)

  if (!tokens) {
    throw new NotFoundError('Calcom tokens not found')
  }

  return tokens
})

/**
 * Get Cal.com username by user ID (lightweight lookup)
 */
export const getCalcomUsernameByUserId = cache(
  async (userId: string): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
    return getUsernameByUserId(userId)
  }
)

/**
 * Get mentor's Cal.com tokens by username
 */
export const getMentorCalcomTokensByUsername = async (
  username: string
): Promise<CalcomToken | null> => {
  const calUser = await getTokensByUsername(username)

  if (!calUser) {
    throw new NotFoundError('Calcom user not found')
  }

  return calUser
}
