'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import posthog from 'posthog-js'
import {
  getClientAnalyticsConsentSnapshot,
  getServerAnalyticsConsentSnapshot,
  subscribeToClientAnalyticsConsent,
} from '~/lib/analytics/client-consent'
import {
  applyClientAnalyticsPreference,
  getBrowserAnalyticsPreference,
  suspendClientAnalytics,
} from '~/lib/analytics/client-posthog'
import {
  fetchAnalyticsPreference,
  persistAnalyticsPreference,
  resolveEffectiveAnalyticsPreference,
  shouldPersistBrowserPreference,
} from '~/lib/analytics/preferences-client'
import { authClient, useSession } from '~/lib/auth-client'

const requestWasAborted = (signal: AbortSignal) => signal.aborted

/**
 * Ensure every visitor has a session without interrupting the experience.
 * Account conversion is always user initiated elsewhere in the product.
 */
export const AnonymousAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession()
  const hasInitialized = useRef(false)
  const hasCapturedResolvedPage = useRef(false)
  const analyticsConsentState = useSyncExternalStore(
    subscribeToClientAnalyticsConsent,
    getClientAnalyticsConsentSnapshot,
    getServerAnalyticsConsentSnapshot
  )
  const userId = session?.user.id
  const isAnonymous = session?.user.isAnonymous === true

  useEffect(() => {
    if (isPending) {
      suspendClientAnalytics()
      return
    }

    const browserPreference = getBrowserAnalyticsPreference()

    if (!userId) {
      applyClientAnalyticsPreference(browserPreference.enabled, {
        persistChoice: browserPreference.explicitConsent !== 'pending',
      })
      return
    }

    const controller = new AbortController()
    suspendClientAnalytics()

    const synchronizePreference = async () => {
      const storedPreference = await fetchAnalyticsPreference(controller.signal)
      if (requestWasAborted(controller.signal)) return

      if (storedPreference === undefined) {
        applyClientAnalyticsPreference(browserPreference.enabled, {
          persistChoice: browserPreference.explicitConsent !== 'pending',
        })
        return
      }

      const preferenceContext = {
        browserPreference,
        storedPreference,
      }
      const effectivePreference = resolveEffectiveAnalyticsPreference(preferenceContext)

      if (shouldPersistBrowserPreference(preferenceContext)) {
        await persistAnalyticsPreference(effectivePreference, controller.signal)
      }

      if (requestWasAborted(controller.signal)) return
      applyClientAnalyticsPreference(effectivePreference, {
        persistChoice: storedPreference !== null || browserPreference.explicitConsent !== 'pending',
      })
    }

    void synchronizePreference()

    return () => controller.abort()
  }, [isAnonymous, isPending, userId])

  useEffect(() => {
    if (analyticsConsentState !== 'enabled') return

    if (userId && !isAnonymous) {
      if (posthog.get_distinct_id() !== userId) {
        posthog.identify(userId)
      }
    } else if (posthog.get_property('$user_id')) {
      posthog.reset()
    }

    // PostHog's automatic initial page view is held by the consent gate. Send
    // it once after consent resolves, after any permanent user identification.
    if (!hasCapturedResolvedPage.current) {
      hasCapturedResolvedPage.current = true
      posthog.capture('$pageview')
    }
  }, [analyticsConsentState, isAnonymous, userId])

  useEffect(() => {
    if (isPending || session || hasInitialized.current) return

    hasInitialized.current = true
    authClient.signIn.anonymous().catch(() => {
      hasInitialized.current = false
    })
  }, [session, isPending])

  return <>{children}</>
}
