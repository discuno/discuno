import jwt from 'jsonwebtoken'
import type { CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import { env } from '~/env'
import { requireAuth } from '~/lib/auth/auth-utils'
import {
  getCalcomUserId,
  getProfile,
  getUserName,
  isEduEmailInUse,
  storeCalcomTokens,
  updateEduEmail,
} from '~/server/queries'

interface VerificationResultProps {
  success: boolean
  message: string
}

const createCalcomUser = async (data: CreateCalcomUserInput, userId: string) => {
  try {
    // TODO: Get time zone from user profile
    const { email, name, timeZone = 'America/New_York' } = data

    console.log('Creating Cal.com user for:', { email, name, userId }) // Debug log

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

    // Check HTTP response status first
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cal.com API HTTP error:', response.status, errorText)
      return {
        success: false,
        error: `Cal.com API error: ${response.status}`,
      }
    }

    const responseData = await response.json()
    console.log('Cal.com response:', responseData) // Debug log

    if (responseData.status !== 'success') {
      console.error('Cal.com API error:', responseData.error)
      return {
        success: false,
        error: responseData.error ?? 'Unknown Cal.com error',
      }
    }

    // Store tokens in database
    try {
      await storeCalcomTokens({
        userId,
        calcomUserId: responseData.data.user.id,
        accessToken: responseData.data.accessToken,
        refreshToken: responseData.data.refreshToken,
        accessTokenExpiresAt: responseData.data.accessTokenExpiresAt,
        refreshTokenExpiresAt: responseData.data.refreshTokenExpiresAt,
      })

      console.log('Tokens stored successfully') // Debug log
    } catch (storageError) {
      console.error('Cal.com user creation error:', storageError)
      return {
        success: false,
        error: 'storage failed',
      }
    }

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

const updateCalcomUser = async (data: UpdateCalcomUserInput, userId: string) => {
  try {
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

    // Update the user profile with the new email
    if (rest.email && rest.email !== data.email) {
      await updateEduEmail(userId, rest.email)
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

export const verifyEmail = async (token: string): Promise<VerificationResultProps> => {
  try {
    // Early validation for empty token
    if (!token || token.trim() === '') {
      return {
        success: false,
        message: 'Verification failed. Please try again.',
      }
    }

    const { id } = await requireAuth()
    // decode jwt
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string
      eduEmail: string
    }

    const { userId, eduEmail } = decoded

    if (id !== userId) {
      return {
        success: false,
        message: 'Unauthorized. Please try again.',
      }
    }

    // Check if email is already in use
    const emailInUse = await isEduEmailInUse(eduEmail)
    if (emailInUse) {
      return {
        success: false,
        message: 'Email already in use. Please try again.',
      }
    }

    // if not in use check if user already has edu email
    const profile = await getProfile(userId)
    if (profile?.isEduVerified) {
      // update calcom user with new email
      const calcomUserId = await getCalcomUserId(userId)
      if (!calcomUserId) {
        return {
          success: false,
          message: 'Failed to get calcom user id. Please try again.',
        }
      }
      // update calcom user with new email
      const res = await updateCalcomUser(
        {
          calcomUserId,
          email: eduEmail,
        },
        id
      )

      if (!res.success) {
        return {
          success: false,
          message: 'Failed to update calcom user. Please try again.',
        }
      }

      // update user profile with new email
      await updateEduEmail(userId, eduEmail)

      return {
        success: true,
        message: 'Email updated successfully!',
      }
    }

    // if not in use and not verified, create calcom user
    const name = await getUserName(userId)
    if (!name) {
      return {
        success: false,
        message: 'Please set your name in the profile page.',
      }
    }

    // create calcom user
    const res = await createCalcomUser(
      {
        email: eduEmail,
        name,
        // TODO: Get time zone from user profile
        timeZone: 'America/New_York',
      },
      id
    )

    if (!res.success) {
      // Check if it's a storage error or API error
      if (res.error && res.error.includes('storage')) {
        return {
          success: false,
          message: 'Verification failed. Please try again.',
        }
      }
      return {
        success: false,
        message: 'Failed to create calcom user. Please try again.',
      }
    }

    await updateEduEmail(userId, eduEmail)

    return {
      success: true,
      message: 'Email verified successfully!',
    }
  } catch (err) {
    console.error('Error verifying email:', err)
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    }
  }
}
