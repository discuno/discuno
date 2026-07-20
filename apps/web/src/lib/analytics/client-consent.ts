export type ClientAnalyticsConsentState = 'pending' | 'enabled' | 'disabled'

let consentState: ClientAnalyticsConsentState = 'pending'
const listeners = new Set<() => void>()

export const getClientAnalyticsConsentSnapshot = (): ClientAnalyticsConsentState => consentState

export const getServerAnalyticsConsentSnapshot = (): ClientAnalyticsConsentState => 'pending'

export const subscribeToClientAnalyticsConsent = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const setClientAnalyticsConsentState = (state: ClientAnalyticsConsentState) => {
  if (state === consentState) return

  consentState = state
  for (const listener of listeners) listener()
}

/**
 * PostHog initializes before React hydrates. Drop events until the durable or
 * browser-only preference has resolved so an opted-out account never leaks an
 * initial page view during that window.
 */
export const gatePostHogCapture = <CaptureResult>(
  result: CaptureResult | null
): CaptureResult | null => (consentState === 'enabled' ? result : null)
