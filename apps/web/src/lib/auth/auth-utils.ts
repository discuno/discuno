import type { Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { auth } from '~/server/auth'

/**
 * Get the current session on the server side
 * Use this in Server Components, Server Actions, and API Routes
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    return await auth()
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Require authentication for a page
 * Redirects to /auth if not authenticated
 * Use this in Server Components that require authentication
 */
export const requireAuth = async (): Promise<Session> => {
  const session: Session | null = await getCurrentSession()

  if (!session) {
    redirect('/auth')
  }

  return session
}

/**
 * Redirect authenticated users away from auth pages
 * Use this on pages like /auth where logged-in users shouldn't be
 */
export const redirectIfAuthenticated = async (redirectTo: string = '/'): Promise<void> => {
  const session = await getCurrentSession()

  if (session) {
    redirect(redirectTo)
  }
}

/**
 * Get user ID from session
 * Throws error if not authenticated
 */
export const requireUserId = async (): Promise<string> => {
  const session: Session = await requireAuth()

  if (!session.user.id) {
    throw new Error('User ID not found in session')
  }

  return session.user.id
}

/**
 * Check if user is authenticated (returns boolean)
 * Use this when you need to conditionally render content
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session: Session | null = await getCurrentSession()
  return !!session
}

/**
 * Get user from session with error handling
 * Returns null if not authenticated or user not found
 */
export const getCurrentUser = async (): Promise<Session['user'] | null> => {
  const session: Session | null = await getCurrentSession()
  return session?.user ?? null
}
