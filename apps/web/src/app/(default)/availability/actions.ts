'use server'

import type { CalcomToken, CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getCalcomToken, getUserCalcomTokens, storeCalcomTokens, updateCalcomToken } from '~/server/queries'

/**
 * Get user's current Cal.com access token
 */
const getCalcomAccessToken = async (
  userId: string
): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}> => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    const tokens = await getUserCalcomTokens(userId)

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
    const newAccessTokenExpiresAt = new Date(refreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000)
    const newRefreshTokenExpiresAt = new Date(
      refreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: refreshData.data.accessToken,
      refreshToken: refreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomToken(token, tokenRecord.userId)

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
    const newAccessTokenExpiresAt = new Date(forceRefreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000)
    const newRefreshTokenExpiresAt = new Date(
      forceRefreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: forceRefreshData.data.accessToken,
      refreshToken: forceRefreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomToken(token, userId)

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
    const { id } = await requireAuth()
    const tokens = await getUserCalcomTokens(id)
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
    const { id } = await requireAuth()
    return await getCalcomAccessToken(id)
  } catch (error) {
    console.error('Get user Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get token',
    }
  }
}

/**
 * Create Cal.com user
 */
const createCalcomUser = async (
  data: CreateCalcomUserInput
): Promise<{
  success: boolean
  calcomUserId?: number
  username?: string
  error?: string
}> => {
  try {
    const { id } = await requireAuth()
    const { email, name, timeZone = 'America/New_York' } = data

    console.log('Creating Cal.com user for:', { email, name, userId: id })

    // Create managed user in Cal.com
    const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cal-secret-key': env.X_CAL_SECRET_KEY,
      },
      body: JSON.stringify({
        email,
        name,
        timeZone,
        timeFormat: 12,
        weekStart: 'Sunday',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cal.com API HTTP error:', response.status, errorText)
      return {
        success: false,
        error: `Cal.com API error: ${response.status}`,
      }
    }

    const responseData = await response.json()
    console.log('Cal.com response:', responseData)

    if (responseData.status !== 'success') {
      console.error('Cal.com API error:', responseData.error)
      return {
        success: false,
        error: responseData.error ?? 'Unknown Cal.com error',
      }
    }

    // Store tokens in database
    await storeCalcomTokens({
      userId: id,
      calcomUserId: responseData.data.user.id,
      accessToken: responseData.data.accessToken,
      refreshToken: responseData.data.refreshToken,
      accessTokenExpiresAt: responseData.data.accessTokenExpiresAt,
      refreshTokenExpiresAt: responseData.data.refreshTokenExpiresAt,
    })

    console.log('Tokens stored successfully')

    return {
      success: true,
      calcomUserId: responseData.data.user.id,
      username: responseData.data.user.username,
    }
  } catch (error) {
    console.error('Cal.com user creation error:', error)
    return {
      success: false,
      error: 'Failed to create Cal.com user',
    }
  }
}

/**
 * Update Cal.com user
 */
const updateCalcomUser = async (
  data: UpdateCalcomUserInput
): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    await requireAuth()
    const { calcomUserId, ...rest } = data

    const response = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users/${calcomUserId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cal-secret-key': env.X_CAL_SECRET_KEY,
        },
        body: JSON.stringify(rest),
      }
    )

    const responseData = await response.json()

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData.error,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Cal.com user update error:', error)
    return {
      success: false,
      error: 'Failed to update Cal.com user',
    }
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
