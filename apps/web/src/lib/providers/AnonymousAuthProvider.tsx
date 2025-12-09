'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { authClient, useSession } from '~/lib/auth-client'

/**
 * AnonymousAuthProvider enforces that all visitors have at least an anonymous session,
 * and shows Google One Tap for anonymous users to optionally upgrade to a real account.
 */
export const AnonymousAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession()
  const hasInitialized = useRef(false)
  const router = useRouter()

  useEffect(() => {
    // Wait for session check to complete
    if (isPending) return

    // Prevent duplicate initialization
    if (hasInitialized.current) return

    // No session at all - create anonymous session
    if (!session) {
      hasInitialized.current = true
      authClient.signIn.anonymous().catch(() => {
        hasInitialized.current = false // Allow retry on error
      })
    }
    // Has anonymous session - show Google One Tap
    else if (session.user.isAnonymous) {
      hasInitialized.current = true
      void authClient.oneTap({})
    }
    // Has real session - do nothing
  }, [session, isPending, router])

  return <>{children}</>
}
