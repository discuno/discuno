import { redirect } from 'next/navigation'
import { getCurrentSession } from '~/lib/auth/auth-utils'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * AuthGuard - Server component that protects routes requiring authentication
 * Redirects to /auth if user is not authenticated
 */
export const AuthGuard = async ({ children }: AuthGuardProps) => {
  const session = await getCurrentSession()

  if (!session) {
    redirect('/auth')
  }

  return <>{children}</>
}
