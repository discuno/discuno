import jwt from 'jsonwebtoken'
import { type UserProfile } from '~/app/types'
import { env } from '~/env'
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '~/lib/auth/auth-utils'
import { createCalcomUser, updateCalcomUser } from '~/lib/calcom'
import {
  getCalcomUserId,
  getProfile,
  getUserName,
  isEduEmailInUse,
  updateEduEmail,
} from '~/server/queries'

export const verifyEmail = async (token: string): Promise<void> => {
  if (!token || token.trim() === '') {
    throw new BadRequestError('Verification failed. Please try again.')
  }

  // Decode JWT first to get userId
  const decoded = jwt.verify(token, env.JWT_SECRET) as {
    userId: string
    eduEmail: string
  }

  const { userId, eduEmail } = decoded

  // Try to get existing profile, but don't fail if it doesn't exist
  let profile: UserProfile | null = null
  let profileUserId: string = userId // Default to token userId

  try {
    const { profile: p, userId: i } = await getProfile()
    profile = p
    profileUserId = i
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Profile doesn't exist yet - this is expected for first-time verification
      // We'll create it when we call updateEduEmail
      profile = null
      profileUserId = userId
    } else {
      throw error // Re-throw unexpected errors
    }
  }

  // Verify the token belongs to the current user
  if (profileUserId !== userId) {
    throw new UnauthorizedError('Unauthorized. Please try again.')
  }

  // Check if email is already in use by another user
  const emailInUse = await isEduEmailInUse(eduEmail)
  if (emailInUse) {
    throw new ConflictError('Email already in use. Please try again.')
  }

  // Get user name (required for Cal.com user creation)
  const name = await getUserName()
  if (!name) {
    throw new BadRequestError('Please set your name in the profile page.')
  }

  // Handle existing verified profile - update email and Cal.com user
  if (profile?.isEduVerified) {
    const calcomUserId = await getCalcomUserId()
    if (!calcomUserId) {
      throw new InternalServerError('Failed to get calcom user id. Please try again.')
    }

    // Update Cal.com user with new email
    await updateCalcomUser({
      userId,
      calcomUserId,
      email: eduEmail,
    })

    // Update user profile with new email
    await updateEduEmail(eduEmail)
    return
  }

  // Handle first-time verification or unverified profile
  // Create Cal.com user for new mentor
  await createCalcomUser({
    userId,
    email: eduEmail,
    name,
    // TODO: Get time zone from user profile
    timeZone: 'America/New_York',
  })

  // Create/update user profile with verified email
  await updateEduEmail(eduEmail)
}
