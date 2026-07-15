import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  gatePostHogCapture,
  getClientAnalyticsConsentSnapshot,
  setClientAnalyticsConsentState,
  subscribeToClientAnalyticsConsent,
} from './client-consent'

describe('client analytics capture gate', () => {
  beforeEach(() => setClientAnalyticsConsentState('pending'))

  it('drops events until consent resolves', () => {
    expect(gatePostHogCapture({ event: '$pageview' })).toBeNull()
  })

  it('passes events only while analytics are enabled', () => {
    const event = { event: 'profile_view' }

    setClientAnalyticsConsentState('enabled')
    expect(gatePostHogCapture(event)).toBe(event)

    setClientAnalyticsConsentState('disabled')
    expect(gatePostHogCapture(event)).toBeNull()
  })

  it('notifies external-store subscribers when the preference changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToClientAnalyticsConsent(listener)

    setClientAnalyticsConsentState('disabled')
    expect(getClientAnalyticsConsentSnapshot()).toBe('disabled')
    expect(listener).toHaveBeenCalledOnce()

    unsubscribe()
    setClientAnalyticsConsentState('enabled')
    expect(listener).toHaveBeenCalledOnce()
  })
})
