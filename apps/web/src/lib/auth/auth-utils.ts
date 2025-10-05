import type { Session, User } from 'next-auth'
import { UnauthenticatedError } from '~/lib/errors'
import { auth } from '~/server/auth'

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
export const requireAuth = async (): Promise<AuthenticatedUser> => {
  const session: Session | null = await auth()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!session?.user?.id) {
    throw new UnauthenticatedError()
  }

  return {
    ...session.user,
    id: session.user.id,
  }
}

/**
 * Get auth session without throwing
 * Returns null if not authenticated, useful for optional auth
 */
export const getAuthSession = async (): Promise<AuthenticatedUser | null> => {
  const session: Session | null = await auth()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!session?.user?.id) {
    return null
  }

  return {
    ...session.user,
    id: session.user.id,
  }
}
