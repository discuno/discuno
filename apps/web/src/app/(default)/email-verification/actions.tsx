'use server'

import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfile } from '~/server/queries'

export const checkVerificationStatus = async (): Promise<boolean> => {
  const { id } = await requireAuth()

  const userProfile = await getProfile(id)

  return userProfile?.isEduVerified ?? false
}
