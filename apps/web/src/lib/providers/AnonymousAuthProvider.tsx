'use client'

import { useEffect, useRef } from 'react'
import { authClient, useSession } from '~/lib/auth-client'

/**
 * Ensure every visitor has a session without interrupting the experience.
 * Account conversion is always user initiated elsewhere in the product.
 */
export const AnonymousAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (isPending || session || hasInitialized.current) return

    hasInitialized.current = true
    authClient.signIn.anonymous().catch(() => {
      hasInitialized.current = false
    })
  }, [session, isPending])

  return <>{children}</>
}
