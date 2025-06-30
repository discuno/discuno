import type { CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { ExternalApiError } from '~/lib/auth/auth-utils'
import { storeCalcomTokens, updateEduEmail } from '~/server/queries'

/**
 * Create Cal.com user (core implementation)
 */
export const createCalcomUser = async (
  data: CreateCalcomUserInput
): Promise<{
  calcomUserId: number
  username: string
}> => {
  const { email, name, timeZone = 'America/New_York' } = data

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

  // Check HTTP response status first
  if (!response.ok) {
    const errorText = await response.text()
    throw new ExternalApiError(`Cal.com API HTTP error: ${response.status}: ${errorText}`)
  }

  const responseData = await response.json()

  if (responseData.status !== 'success') {
    throw new ExternalApiError(`Cal.com API error: ${responseData.error}`)
  }

  // Store tokens in database
  await storeCalcomTokens({
    calcomUserId: responseData.data.user.id,
    calcomUsername: responseData.data.user.username,
    accessToken: responseData.data.accessToken,
    refreshToken: responseData.data.refreshToken,
    accessTokenExpiresAt: responseData.data.accessTokenExpiresAt,
    refreshTokenExpiresAt: responseData.data.refreshTokenExpiresAt,
  })

  return {
    calcomUserId: responseData.data.user.id,
    username: responseData.data.user.username,
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

  // Update the user profile with the new email
  if (email) {
    await updateEduEmail(email)
  }
}
