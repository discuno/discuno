import type { NewCalcomToken } from '~/lib/schemas/db'
import {
  type CalcomConnectionWriteResult,
  getUserIdByCalcomUserId as getUserIdByCalcomUserIdDal,
  storeCalcomConnection,
} from '~/server/dal/calcom'

/** Store the encrypted standard OAuth connection for a Discuno user. */
export const storeCalcomConnectionForUser = async (
  data: NewCalcomToken
): Promise<CalcomConnectionWriteResult> => {
  return storeCalcomConnection(data)
}

/** Resolve a Discuno user from a Cal.com webhook organizer ID. */
export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  return getUserIdByCalcomUserIdDal(calcomUserId)
}
