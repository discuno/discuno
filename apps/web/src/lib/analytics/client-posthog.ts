import posthog from 'posthog-js'
import { setClientAnalyticsConsentState, type ClientAnalyticsConsentState } from './client-consent'

export type BrowserAnalyticsPreference = {
  enabled: boolean
  explicitConsent: 'granted' | 'denied' | 'pending'
}

/**
 * Read stored PostHog consent separately from Do Not Track. This lets an
 * explicit local denial always win while allowing a deliberate opt-in to
 * override DNT, as the privacy control promises.
 */
export const getBrowserAnalyticsPreference = (): BrowserAnalyticsPreference => {
  const respectDnt = posthog.config.respect_dnt
  if (respectDnt) posthog.set_config({ respect_dnt: false })
  const explicitConsent = posthog.get_explicit_consent_status()
  if (respectDnt) posthog.set_config({ respect_dnt: true })

  return {
    // An unset preference is not consent. DNT remains an additional guard,
    // while only a deliberate browser grant enables optional analytics.
    enabled: explicitConsent === 'granted',
    explicitConsent,
  }
}

export const suspendClientAnalytics = () => {
  setClientAnalyticsConsentState('pending')
  posthog.stopSessionRecording()
}

export const applyClientAnalyticsPreference = (
  analyticsEnabled: boolean,
  options: { persistChoice?: boolean } = { persistChoice: true }
): ClientAnalyticsConsentState => {
  const nextState = analyticsEnabled ? 'enabled' : 'disabled'
  const persistChoice = options.persistChoice ?? true

  // Update the synchronous capture gate before changing PostHog state.
  setClientAnalyticsConsentState(nextState)

  if (analyticsEnabled) {
    // Every enabled state comes from an explicit browser or account choice.
    // Persist it locally so PostHog can leave its opt-out-by-default mode.
    posthog.set_config({ respect_dnt: false })
    posthog.opt_in_capturing({ captureEventName: false })
    // Product events are sufficient for launch analytics. Session replay stays
    // disabled until Discuno has a separately disclosed retention policy and a
    // dedicated replay consent control.
    posthog.stopSessionRecording()
  } else {
    posthog.stopSessionRecording()
    posthog.set_config({ respect_dnt: true })
    // Keep an unset preference distinct from an explicit rejection. The SDK
    // already starts opted out, and the synchronous gate remains disabled.
    if (persistChoice) posthog.opt_out_capturing()
  }

  return nextState
}
