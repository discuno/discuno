import type { BrowserAnalyticsPreference } from './client-posthog'

const ANALYTICS_PREFERENCE_ENDPOINT = '/api/preferences/analytics'

export type AnalyticsPreferencePersistence = 'saved' | 'browser-only' | 'failed'

const parsePreferenceResponse = (value: unknown): boolean | null | undefined => {
  if (!value || typeof value !== 'object' || !('analyticsEnabled' in value)) return undefined

  const analyticsEnabled = (value as Record<string, unknown>).analyticsEnabled
  return typeof analyticsEnabled === 'boolean' || analyticsEnabled === null
    ? analyticsEnabled
    : undefined
}

export const fetchAnalyticsPreference = async (
  signal?: AbortSignal
): Promise<boolean | null | undefined> => {
  try {
    const response = await fetch(ANALYTICS_PREFERENCE_ENDPOINT, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
    })

    if (!response.ok) return undefined
    return parsePreferenceResponse(await response.json())
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return undefined
    return undefined
  }
}

export const persistAnalyticsPreference = async (
  analyticsEnabled: boolean,
  signal?: AbortSignal
): Promise<AnalyticsPreferencePersistence> => {
  try {
    const response = await fetch(ANALYTICS_PREFERENCE_ENDPOINT, {
      method: 'PATCH',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ analyticsEnabled }),
      signal,
    })

    if (response.status === 401) return 'browser-only'
    if (!response.ok) return 'failed'

    return parsePreferenceResponse(await response.json()) === analyticsEnabled ? 'saved' : 'failed'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'browser-only'
    return 'failed'
  }
}

export const resolveEffectiveAnalyticsPreference = ({
  browserPreference,
  storedPreference,
}: {
  browserPreference: BrowserAnalyticsPreference
  storedPreference: boolean | null
}): boolean => {
  // An explicit local denial is the newest privacy signal and always wins,
  // including for permanent users whose stored preference was enabled.
  if (browserPreference.explicitConsent === 'denied') return false

  // Non-null database values represent an explicit user-level choice. An
  // explicit account opt-in can therefore override DNT on a new browser.
  if (storedPreference !== null) return storedPreference

  // No stored account choice and no explicit browser grant means disabled.
  return browserPreference.explicitConsent === 'granted'
}

export const shouldPersistBrowserPreference = ({
  browserPreference,
  storedPreference,
}: {
  browserPreference: BrowserAnalyticsPreference
  storedPreference: boolean | null
}): boolean => {
  if (browserPreference.explicitConsent === 'denied') return storedPreference !== false

  // Persist only a deliberate local choice. An unset preference remains null
  // and disabled; DNT alone is not manufactured into an account-level denial.
  if (storedPreference === null) {
    return browserPreference.explicitConsent !== 'pending'
  }

  return false
}
