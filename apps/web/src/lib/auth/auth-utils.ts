import type { Session, User } from 'better-auth'
import { headers } from 'next/headers'
import { auth } from '~/lib/auth'
import { AUTH_SESSION_FRESH_AGE_SECONDS } from '~/lib/auth/config'
import { SessionNotFreshError, UnauthenticatedError, UnauthorizedError } from '~/lib/errors'

export type AuthenticatedUser = User & {
  id: string
  role?: string
  isAnonymous?: boolean
  analyticsEnabled?: boolean | null
}

// Re-export error classes for convenience
export {
  AppError,
  BadRequestError,
  ConflictError,
  ExternalApiError,
  InternalServerError,
  NotFoundError,
  SessionNotFreshError,
  UnauthenticatedError,
  UnauthorizedError,
} from '~/lib/errors'

type SessionFreshnessOptions = {
  freshAgeSeconds?: number
  now?: number
}

/** Match Better Auth's fresh-session boundary exactly: the session becomes
 * stale when its age is greater than or equal to `freshAge`.
 */
export const isSessionFresh = (
  session: Pick<Session, 'createdAt'>,
  {
    freshAgeSeconds = AUTH_SESSION_FRESH_AGE_SECONDS,
    now = Date.now(),
  }: SessionFreshnessOptions = {}
): boolean => {
  if (freshAgeSeconds === 0) return true

  const createdAt = new Date(session.createdAt).getTime()
  return !(now - createdAt >= freshAgeSeconds * 1000)
}

export const assertSessionIsFresh = (
  session: Pick<Session, 'createdAt'>,
  options?: SessionFreshnessOptions
): void => {
  if (!isSessionFresh(session, options)) throw new SessionNotFreshError()
}

const readAuthSession = async (
  disableCookieCache: boolean
): Promise<{ session: Session; user: AuthenticatedUser } | null> => {
  const res = await auth.api.getSession({
    headers: await headers(),
    query: disableCookieCache ? { disableCookieCache: true } : undefined,
  })

  const session = res?.session
  const user = res?.user as AuthenticatedUser | undefined

  if (!session?.userId || !user) return null

  return { session, user }
}

/**
 * Require authentication for a page
 * Use this in Server Components that require authentication
 * Allows anonymous sessions - use requireNonAnonymousAuth to block anonymous users
 */
export const requireAuth = async (): Promise<{ session: Session; user: AuthenticatedUser }> => {
  const result = await readAuthSession(false)
  if (!result) throw new UnauthenticatedError()
  return result
}

/**
 * Get auth session without throwing
 * Returns null if not authenticated, useful for optional auth
 */
export const getAuthSession = async (): Promise<{
  session: Session
  user: AuthenticatedUser
} | null> => {
  return readAuthSession(false)
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
 * Require a valid session created inside the configured freshness window.
 * Cookie caching is bypassed so a revoked session cannot authorize a
 * credential-sensitive mutation.
 */
export const requireFreshAuth = async (): Promise<{
  session: Session
  user: AuthenticatedUser
}> => {
  const result = await readAuthSession(true)
  if (!result) throw new UnauthenticatedError()

  assertSessionIsFresh(result.session)
  return result
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
 * // Require access to mentor dashboard data
 * await requirePermission({ mentor: ['manage'] })
 *
 * @example
 * // Require permission to update user-authored content
 * await requirePermission({ content: ['update'] })
 */
export const requirePermission = async (
  permissions: Record<string, string[]>
): Promise<{
  session: Session
  user: AuthenticatedUser
}> => {
  // Permission checks are the query-layer security boundary. Bypass the
  // short-lived cookie cache so session revocation takes effect immediately.
  const result = await readAuthSession(true)
  if (!result || result.user.isAnonymous) {
    throw new UnauthenticatedError('Please sign in to continue')
  }
  const { session, user } = result

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

/** Require the normal ACL boundary and a recently-created session. */
export const requireFreshPermission = async (
  permissions: Record<string, string[]>
): Promise<{
  session: Session
  user: AuthenticatedUser
}> => {
  const result = await requirePermission(permissions)
  assertSessionIsFresh(result.session)
  return result
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
    const session = await readAuthSession(true)
    if (!session || session.user.isAnonymous) return false

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
