import type { Session, User } from 'better-auth'
import { headers } from 'next/headers'
import { auth } from '~/lib/auth'
import { UnauthenticatedError } from '~/lib/errors'

export type AuthenticatedUser = User & {
  id: string
}

// Re-export error classes for convenience
export {
  AppError,
  BadRequestError,
  ConflictError,
  ExternalApiError,
  InternalServerError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from '~/lib/errors'

/**
 * Require authentication for a page
 * Use this in Server Components that require authentication
 */
export const requireAuth = async (): Promise<{ session: Session; user: User }> => {
  const res = await auth.api.getSession({
    headers: await headers(),
  })

  const session = res?.session
  const user = res?.user

  if (!session?.userId || !user) {
    throw new UnauthenticatedError()
  }

  return {
    session,
    user,
  }
}

/**
 * Get auth session without throwing
 * Returns null if not authenticated, useful for optional auth
 */
export const getAuthSession = async (): Promise<{ session: Session; user: User } | null> => {
  const res = await auth.api.getSession({
    headers: await headers(),
  })

  const session = res?.session
  const user = res?.user

  if (!session?.userId || !user) {
    return null
  }

  return {
    session,
    user,
  }
}
