import type { CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { BadRequestError, ExternalApiError } from '~/lib/auth/auth-utils'
import { storeCalcomTokens, storeCalcomTokensForUser } from '~/server/queries'

/**
 * Create Cal.com user (core implementation)
 */
export const createCalcomUser = async (
  data: CreateCalcomUserInput & { userId?: string }
): Promise<{
  calcomUserId: number
  username: string
}> => {
  try {
    const { email, name, timeZone, userId } = data

    // Create managed user in Cal.com
    const response = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users`,
      {
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
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cal.com user creation failed:', response.status, errorText)
      throw new ExternalApiError(`Cal.com API error: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()

    if (responseData.status !== 'success') {
      console.error('Cal.com user creation response error:', responseData)
      throw new ExternalApiError(`Cal.com user creation failed: ${JSON.stringify(responseData)}`)
    }

    const calcomUser = responseData.data

    // Store tokens in our database
    // Use the version that accepts userId directly if provided (during auth flow)
    // Otherwise use the session-based version (for authenticated users)
    if (userId) {
      await storeCalcomTokensForUser({
        userId,
        calcomUserId: calcomUser.user.id,
        calcomUsername: calcomUser.user.username,
        accessToken: calcomUser.accessToken,
        refreshToken: calcomUser.refreshToken,
        accessTokenExpiresAt: calcomUser.accessTokenExpiresAt,
        refreshTokenExpiresAt: calcomUser.refreshTokenExpiresAt,
      })
    } else {
      await storeCalcomTokens({
        calcomUserId: calcomUser.user.id,
        calcomUsername: calcomUser.user.username,
        accessToken: calcomUser.accessToken,
        refreshToken: calcomUser.refreshToken,
        accessTokenExpiresAt: calcomUser.accessTokenExpiresAt,
        refreshTokenExpiresAt: calcomUser.refreshTokenExpiresAt,
      })
    }

    return {
      calcomUserId: calcomUser.user.id,
      username: calcomUser.user.username,
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
 * Update Cal.com user (core implementation)
 */
export const updateCalcomUser = async (data: UpdateCalcomUserInput): Promise<void> => {
  const { calcomUserId, email, ...rest } = data

  const response = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users/${calcomUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-cal-secret-key': env.X_CAL_SECRET_KEY,
      },
      body: JSON.stringify({ email, ...rest }),
    }
  )

  const responseData = await response.json()

  if (responseData.status !== 'success') {
    throw new ExternalApiError(`Cal.com API error: ${responseData.error}`)
  }

  // User's .edu email is already verified through the auth process
}
