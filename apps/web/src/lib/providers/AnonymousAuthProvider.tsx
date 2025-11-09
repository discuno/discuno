'use client'

import { useEffect, useRef } from 'react'
import { authClient, useSession } from '~/lib/auth-client'

/**
 * AnonymousAuthProvider automatically initializes anonymous sessions
 * and shows Google One Tap for unauthenticated visitors
 */
export const AnonymousAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession()
  const hasInitialized = useRef(false)
  const hasShownOneTap = useRef(false)

  useEffect(() => {
    // Wait for session check to complete
    if (isPending) return

    // If no session exists, create an anonymous session
    if (!session && !hasInitialized.current) {
      hasInitialized.current = true
      console.log('[AnonymousAuth] Creating anonymous session...')
      authClient.signIn
        .anonymous()
        .then(response => {
          console.log('[AnonymousAuth] Anonymous session created successfully', response)
        })
        .catch(error => {
          console.error('[AnonymousAuth] Error creating anonymous session:', error)
          hasInitialized.current = false // Allow retry
        })
    }
  }, [session, isPending])

  useEffect(() => {
    // Wait for session check to complete
    if (isPending) return

    // Show Google One Tap if user is anonymous
    if (session?.user && 'isAnonymous' in session.user && session.user.isAnonymous) {
      if (!hasShownOneTap.current) {
        hasShownOneTap.current = true
        console.log('[AnonymousAuth] Showing Google One Tap for anonymous user...')

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          authClient
            .oneTap({
              fetchOptions: {
                onSuccess: () => {
                  console.log('[AnonymousAuth] User authenticated via One Tap')
                  // Reload to get new session
                  window.location.reload()
                },
                onError: error => {
                  console.error('[AnonymousAuth] One Tap authentication error:', error)
                },
              },
            })
            .then(() => {
              console.log('[AnonymousAuth] One Tap initialized')
            })
            .catch(error => {
              console.error('[AnonymousAuth] Error showing One Tap:', error)
              hasShownOneTap.current = false // Allow retry
            })
        }, 500)
      }
    }
  }, [session, isPending])

  return <>{children}</>
}
