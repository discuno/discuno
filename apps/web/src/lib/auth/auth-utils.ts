import type { Session, User } from 'better-auth'
import { headers } from 'next/headers'
import { auth } from '~/lib/auth'
import { UnauthenticatedError, UnauthorizedError } from '~/lib/errors'

export type AuthenticatedUser = User & {
  id: string
  role?: string
  isAnonymous?: boolean
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
 * Allows anonymous sessions - use requireNonAnonymousAuth to block anonymous users
 */
export const requireAuth = async (): Promise<{ session: Session; user: AuthenticatedUser }> => {
  const res = await auth.api.getSession({
    headers: await headers(),
  })

  const session = res?.session
  const user = res?.user as AuthenticatedUser | undefined

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
export const getAuthSession = async (): Promise<{
  session: Session
  user: AuthenticatedUser
} | null> => {
  const res = await auth.api.getSession({
    headers: await headers(),
  })

  const session = res?.session
  const user = res?.user as AuthenticatedUser | undefined

  if (!session?.userId || !user) {
    return null
  }

  return {
    session,
    user,
  }
}

/**
 * Require non-anonymous authentication
 * Throws if user is anonymous or not authenticated
 * Use this for actions that require a real authenticated user
 */
export const requireNonAnonymousAuth = async (): Promise<{
  session: Session
  user: AuthenticatedUser
}> => {
  const { session, user } = await requireAuth()

  if (user.isAnonymous) {
    throw new UnauthenticatedError('Please sign in to continue')
  }

  return { session, user }
}

/**
 * Require specific permissions using ACL
 *
 * Checks if the current user has the required permissions for the specified resources.
 * Throws UnauthorizedError if user lacks any of the required permissions.
 *
 * @param permissions - Object mapping resource names to arrays of required actions
 * @returns Session and user if authorized
 * @throws UnauthenticatedError if not logged in or anonymous
 * @throws UnauthorizedError if missing required permissions
 *
 * @example
 * // Require ability to read availability
 * await requirePermission({ availability: ['read'] })
 *
 * @example
 * // Require multiple permissions
 * await requirePermission({
 *   availability: ['read', 'update'],
 *   eventType: ['read']
 * })
 */
export const requirePermission = async (
  permissions: Record<string, string[]>
): Promise<{
  session: Session
  user: AuthenticatedUser
}> => {
  const { session, user } = await requireNonAnonymousAuth()

  // Check if user has the required permissions
  const { success } = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permissions,
    },
  })

  if (!success) {
    const requiredPerms = Object.entries(permissions)
      .map(([resource, actions]) => `${resource}:${actions.join(',')}`)
      .join('; ')

    throw new UnauthorizedError(
      `Missing required permissions: ${requiredPerms}. Your role: ${user.role ?? 'none'}`
    )
  }

  return { session, user }
}

/**
 * Check if current user has specific permissions (non-throwing)
 *
 * Useful for conditional rendering or logic where you want to check permissions
 * without throwing an error.
 *
 * @param permissions - Object mapping resource names to arrays of required actions
 * @returns true if user has all permissions, false otherwise
 *
 * @example
 * const canManageMentorProfile = await hasPermission({ mentor: ['manage'] })
 * if (canManageMentorProfile) {
 *   // Show mentor dashboard UI
 * }
 */
export const hasPermission = async (permissions: Record<string, string[]>): Promise<boolean> => {
  try {
    const session = await getAuthSession()
    if (!session) return false

    console.log('permissions', permissions)

    const { success } = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permissions,
      },
    })

    return success
  } catch {
    return false
  }
}
