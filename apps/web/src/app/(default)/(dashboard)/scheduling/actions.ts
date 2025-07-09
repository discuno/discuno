'use server'

import type { CalcomToken, CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { BadRequestError, ExternalApiError } from '~/lib/auth/auth-utils'
import {
  createCalcomUser as createCalcomUserCore,
  updateCalcomUser as updateCalcomUserCore,
} from '~/lib/calcom'
import { getUserCalcomTokens, updateCalcomTokensByUserId } from '~/server/queries'

/**
 * Get user's current Cal.com access token
 */
const getCalcomAccessToken = async (): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  username?: string
  error?: string
}> => {
  try {
    console.log('getCalcomAccessToken')
    const tokens = await getUserCalcomTokens()
    console.log('tokens', tokens)

    if (!tokens) {
      return {
        success: false,
        error: 'No Cal.com tokens found',
      }
    }

    console.log('tokens.accessToken', tokens.accessToken)

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      username: tokens.calcomUsername,
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
const refreshCalcomToken = async (): Promise<{
  success: boolean
  accessToken: string
  error?: string
}> => {
  try {
    const tokenRecord = await getUserCalcomTokens()
    if (!tokenRecord) {
      return {
        success: false,
        accessToken: '',
        error: 'Token not found',
      }
    }

    // Check if refresh token is expired
    const now = new Date()
    if (tokenRecord.accessTokenExpiresAt < now) {
      // Try force refresh if refresh token is expired
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    // Refresh the tokens using Cal.com API v2 - correct endpoint from docs
    const refreshResponse = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth/${env.NEXT_PUBLIC_X_CAL_ID}/refresh`,
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

      // Try force refresh on any failure
      console.log('Normal refresh failed, trying force refresh...')
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    const refreshData = await refreshResponse.json()

    if (refreshData.status !== 'success') {
      console.error('Refresh response error:', refreshData)
      // Try force refresh on any failure
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
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

    await updateCalcomTokensByUserId({
      userId: tokenRecord.userId,
      calcomUserId: tokenRecord.calcomUserId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt.getTime(),
      refreshTokenExpiresAt: token.refreshTokenExpiresAt.getTime(),
    })

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

    await updateCalcomTokensByUserId({
      userId,
      calcomUserId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt.getTime(),
      refreshTokenExpiresAt: token.refreshTokenExpiresAt.getTime(),
    })

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
      error: 'Token refresh failed',
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

/**
 * Get availability settings for the current user
 * This can be used with Cal.com's AvailabilitySettings component
 */
const getAvailabilitySettings = async (): Promise<{
  success: boolean
  data?: any
  error?: string
}> => {
  try {
    const tokenResult = await getCalcomAccessToken()

    if (!tokenResult.success || !tokenResult.accessToken) {
      return {
        success: false,
        error: 'No valid access token available',
      }
    }

    // Check if token is expired and refresh if needed
    const tokens = await getUserCalcomTokens()
    if (!tokens) {
      return {
        success: false,
        error: 'No Cal.com tokens found',
      }
    }

    // Check if access token is expired
    const now = new Date()
    if (tokens.accessTokenExpiresAt < now) {
      console.log('🔄 Access token expired, refreshing...')
      const refreshResult = await refreshCalcomToken()

      if (!refreshResult.success) {
        return {
          success: false,
          error: 'Failed to refresh token',
        }
      }
    }

    // Fetch user's schedules from Cal.com API
    const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/schedules`, {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch availability settings:', response.status, errorText)
      return {
        success: false,
        error: `Failed to fetch availability: ${response.status}`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Get availability settings error:', error)
    return {
      success: false,
      error: 'Failed to get availability settings',
    }
  }
}

export const fetchEventTypes = async () => {
  const tokenResult = await getCalcomAccessToken()
  if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.username) {
    throw new Error('No valid Cal.com access token available')
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types?username=${encodeURIComponent(tokenResult.username)}`,
    {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-06-14',
      },
    }
  )

  if (!response.ok) {
    throw new ExternalApiError('Failed to fetch event types')
  }

  const payload = await response.json()
  return Array.isArray(payload.data) ? payload.data : []
}

export {
  createCalcomUser,
  forceRefreshCalcomToken,
  getAvailabilitySettings,
  getCalcomAccessToken,
  getUserCalcomToken,
  hasCalcomIntegration,
  refreshCalcomToken,
  updateCalcomUser,
}
