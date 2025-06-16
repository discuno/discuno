import { redirect } from 'next/navigation'
import { getCurrentSession } from '~/lib/auth/auth-utils'

interface PublicGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * PublicGuard - Server component that redirects authenticated users
 * Use this for pages like /auth where logged-in users shouldn't access
 */
export const PublicGuard = async ({ children, redirectTo = '/' }: PublicGuardProps) => {
  const session = await getCurrentSession()

  if (session) {
    redirect(redirectTo)
  }

  return <>{children}</>
}
