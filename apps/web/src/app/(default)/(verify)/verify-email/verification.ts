import jwt from 'jsonwebtoken'
import { env } from '~/env'
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
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
  // if not in use check if user already has edu email
  const { profile, userId: id } = await getProfile()

  if (!token || token.trim() === '') {
    throw new BadRequestError('Verification failed. Please try again.')
  }

  // decode jwt
  const decoded = jwt.verify(token, env.JWT_SECRET) as {
    userId: string
    eduEmail: string
  }

  const { userId, eduEmail } = decoded

  if (id !== userId) {
    throw new UnauthorizedError('Unauthorized. Please try again.')
  }

  // Check if email is already in use
  const emailInUse = await isEduEmailInUse(eduEmail)
  if (emailInUse) {
    throw new ConflictError('Email already in use. Please try again.')
  }

  if (profile?.isEduVerified) {
    // update calcom user with new email
    const calcomUserId = await getCalcomUserId()
    if (!calcomUserId) {
      throw new InternalServerError('Failed to get calcom user id. Please try again.')
    }
    // update calcom user with new email
    await updateCalcomUser({
      userId,
      calcomUserId,
      email: eduEmail,
    })

    // update user profile with new email
    await updateEduEmail(eduEmail)
  }

  // if not in use and not verified, create calcom user
  const name = await getUserName()
  if (!name) {
    throw new BadRequestError('Please set your name in the profile page.')
  }

  // create calcom user
  await createCalcomUser({
    userId,
    email: eduEmail,
    name,
    // TODO: Get time zone from user profile
    timeZone: 'America/New_York',
  })

  await updateEduEmail(eduEmail)
}
