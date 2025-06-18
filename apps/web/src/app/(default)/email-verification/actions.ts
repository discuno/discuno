'use server'

import { getProfile } from '~/server/queries'

export const checkVerificationStatus = async (): Promise<boolean> => {
  const { profile } = await getProfile()

  return profile?.isEduVerified ?? false
}
