import type { NewCalcomToken, UpdateCalcomToken } from '~/lib/schemas/db'
import {
  storeTokens,
  updateTokens,
  getUserIdByCalcomUserId as getUserIdByCalcomUserIdDal,
} from '~/server/dal/calcom'

/**
 * Services Layer for Cal.com token management
 * Handles token storage and updates
 */

/**
 * Store Cal.com tokens for a specific user ID (used during authentication flow)
 */
export const storeCalcomTokensForUser = async (data: NewCalcomToken): Promise<void> => {
  return storeTokens(data)
}

/**
 * Update Cal.com tokens by user ID
 */
export const updateCalcomTokensByUserId = async (
  userId: string,
  data: UpdateCalcomToken
): Promise<void> => {
  return updateTokens(userId, data)
}

/**
 * Get user ID by Cal.com user ID
 */
export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  return getUserIdByCalcomUserIdDal(calcomUserId)
}
