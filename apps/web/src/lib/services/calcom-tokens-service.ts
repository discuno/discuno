import type { NewCalcomToken } from '~/lib/schemas/db'
import {
  getUserIdByCalcomUserId as getUserIdByCalcomUserIdDal,
  storeCalcomConnection,
} from '~/server/dal/calcom'

/** Store the Cal.com organization identity for a Discuno user. */
export const storeCalcomConnectionForUser = async (data: NewCalcomToken): Promise<void> => {
  return storeCalcomConnection(data)
}

/** Resolve a Discuno user from a Cal.com webhook organizer ID. */
export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  return getUserIdByCalcomUserIdDal(calcomUserId)
}
