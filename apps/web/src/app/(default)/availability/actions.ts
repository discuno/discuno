'use server'

import type { CalcomToken, CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { BadRequestError, ExternalApiError } from '~/lib/auth/auth-utils'
import {
  createCalcomUser as createCalcomUserCore,
  updateCalcomUser as updateCalcomUserCore,
} from '~/lib/calcom'
import { getCalcomToken, getUserCalcomTokens, updateCalcomToken } from '~/server/queries'

/**
 * Get user's current Cal.com access token
 */
const getCalcomAccessToken = async (): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}> => {
  try {
    const tokens = await getUserCalcomTokens()

    if (!tokens) {
      return {
        success: false,
        error: 'No Cal.com tokens found',
      }
    }

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  } catch (error) {
    console.error('Get Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get token',
    }
  }
}

/**
 * Refresh Cal.com access token
 */
const refreshCalcomToken = async (
  accessToken: string
): Promise<{
  success: boolean
  accessToken: string
  error?: string
}> => {
  try {
    const tokenRecord = await getCalcomToken(accessToken)

    if (!tokenRecord) {
      return {
        success: false,
        accessToken: '',
        error: 'Token not found',
      }
    }

    // Check if refresh token is expired
    const now = new Date()
    if (tokenRecord.refreshTokenExpiresAt < now) {
      // Try force refresh if refresh token is expired
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    // Refresh the tokens using Cal.com API - correct endpoint from docs
    const refreshResponse = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users/${tokenRecord.calcomUserId}/refresh-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cal-secret-key': env.X_CAL_SECRET_KEY,
        },
        body: JSON.stringify({
          refreshToken: tokenRecord.refreshToken,
        }),
      }
    )

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('Normal refresh failed:', refreshResponse.status, errorText)

      // Only try force refresh if refresh token is truly expired
      if (refreshResponse.status === 498) {
        console.log('Token appears invalid, trying force refresh...')
        return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
      }

      return {
        success: false,
        accessToken: '',
        error: 'Token refresh failed',
      }
    }

    const refreshData = await refreshResponse.json()

    if (refreshData.status !== 'success') {
      console.error('Refresh response error:', refreshData)
      return {
        success: false,
        accessToken: '',
        error: 'Token refresh failed',
      }
    }

    // Use the expiration times from the API response
    const newAccessTokenExpiresAt = new Date(
      refreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000
    )
    const newRefreshTokenExpiresAt = new Date(
      refreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: refreshData.data.accessToken,
      refreshToken: refreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomToken(token)

    console.log('Token refresh successful')

    return {
      success: true,
      accessToken: refreshData.data.accessToken,
    }
  } catch (error) {
    console.error('Cal.com refresh token error:', error)
    return {
      success: false,
      accessToken: '',
      error: 'Token refresh failed',
    }
  }
}

/**
 * Force refresh Cal.com tokens when refresh token is expired
 */
const forceRefreshCalcomToken = async (
  calcomUserId: number,
  userId: string
): Promise<{
  success: boolean
  accessToken: string
  error?: string
}> => {
  try {
    console.log('Attempting force refresh for user:', userId, 'calcom user:', calcomUserId)

    // Correct endpoint from Cal.com API v2 docs
    const forceRefreshResponse = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users/${calcomUserId}/force-refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cal-secret-key': env.X_CAL_SECRET_KEY,
        },
        body: JSON.stringify({}),
      }
    )

    if (!forceRefreshResponse.ok) {
      const errorText = await forceRefreshResponse.text()
      console.error('Force refresh failed:', forceRefreshResponse.status, errorText)
      throw new Error(`Force refresh failed: ${forceRefreshResponse.status} - ${errorText}`)
    }

    const forceRefreshData = await forceRefreshResponse.json()

    if (forceRefreshData.status !== 'success') {
      console.error('Force refresh response error:', forceRefreshData)
      throw new Error(`Force refresh API error: ${JSON.stringify(forceRefreshData)}`)
    }

    // Use the expiration times from the API response
    const newAccessTokenExpiresAt = new Date(
      forceRefreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000
    )
    const newRefreshTokenExpiresAt = new Date(
      forceRefreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: forceRefreshData.data.accessToken,
      refreshToken: forceRefreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomToken(token)

    console.log('Force refresh successful for user:', userId)

    return {
      success: true,
      accessToken: forceRefreshData.data.accessToken,
    }
  } catch (error) {
    console.error('Cal.com force refresh error:', error)
    return {
      success: false,
      accessToken: '',
      error: 'Token refresh f sffiled',
    }
  }
}

/**
 * Check if user has Cal.com integration set up
 */
const hasCalcomIntegration = async () => {
  try {
    const tokens = await getUserCalcomTokens()
    return !!tokens
  } catch (error) {
    console.error('Check Cal.com integration error:', error)
    return false
  }
}

/**
 * Get user's Cal.com token
 */
const getUserCalcomToken = async (): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}> => {
  try {
    return await getCalcomAccessToken()
  } catch (error) {
    console.error('Get user Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get token',
    }
  }
}

/**
 * Create Cal.com user (server action wrapper)
 */
const createCalcomUser = async (
  data: CreateCalcomUserInput
): Promise<{
  calcomUserId?: number
  username?: string
}> => {
  try {
    const result = await createCalcomUserCore(data)
    return {
      calcomUserId: result.calcomUserId,
      username: result.username,
    }
  } catch (error) {
    console.error('Cal.com user creation error:', error)
    if (error instanceof ExternalApiError) {
      throw error
    }
    throw new BadRequestError('Failed to create Cal.com user')
  }
}

/**
 * Update Cal.com user (server action wrapper)
 */
const updateCalcomUser = async (data: UpdateCalcomUserInput): Promise<void> => {
  try {
    await updateCalcomUserCore(data)
  } catch (error) {
    console.error('Cal.com user update error:', error)
    if (error instanceof ExternalApiError) {
      throw error
    }
    throw new BadRequestError('Failed to update Cal.com user')
  }
}

export {
  createCalcomUser,
  forceRefreshCalcomToken,
  getCalcomAccessToken,
  getUserCalcomToken,
  hasCalcomIntegration,
  refreshCalcomToken,
  updateCalcomUser,
}
