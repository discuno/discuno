import { auth } from '~/server/auth'

export const requireAuth = async () => {
  const session = await auth()
  const user = session?.user
  if (!user?.id) {
    throw new Error('Authentication required')
  }
  return user
}
