'use server'

import { requireUserId } from '~/lib/auth/auth-utils'
import { getProfile } from '~/server/queries'

export const checkVerificationStatus = async (): Promise<boolean> => {
  const id = await requireUserId()
  const userProfile = await getProfile(id)

  return userProfile?.isEduVerified ?? false
}
