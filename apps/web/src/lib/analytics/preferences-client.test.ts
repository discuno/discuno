import { describe, expect, it } from 'vitest'
import {
  resolveEffectiveAnalyticsPreference,
  shouldPersistBrowserPreference,
} from './preferences-client'

describe('analytics preference reconciliation', () => {
  it('lets an explicit local denial override an enabled permanent account', () => {
    const context = {
      browserPreference: { enabled: false, explicitConsent: 'denied' as const },
      storedPreference: true,
    }

    expect(resolveEffectiveAnalyticsPreference(context)).toBe(false)
    expect(shouldPersistBrowserPreference(context)).toBe(true)
  })

  it('keeps analytics disabled without manufacturing an account choice', () => {
    const context = {
      browserPreference: { enabled: false, explicitConsent: 'pending' as const },
      storedPreference: null,
    }

    expect(resolveEffectiveAnalyticsPreference(context)).toBe(false)
    expect(shouldPersistBrowserPreference(context)).toBe(false)
  })

  it('does not treat an unset browser preference as consent', () => {
    const context = {
      browserPreference: { enabled: false, explicitConsent: 'pending' as const },
      storedPreference: null,
    }

    expect(resolveEffectiveAnalyticsPreference(context)).toBe(false)
    expect(shouldPersistBrowserPreference(context)).toBe(false)
  })

  it('allows an explicit account opt-in to override DNT', () => {
    expect(
      resolveEffectiveAnalyticsPreference({
        browserPreference: { enabled: false, explicitConsent: 'pending' },
        storedPreference: true,
      })
    ).toBe(true)
  })

  it('persists a deliberate browser opt-in for an unset account', () => {
    expect(
      shouldPersistBrowserPreference({
        browserPreference: { enabled: true, explicitConsent: 'granted' },
        storedPreference: null,
      })
    ).toBe(true)
  })

  it('persists a deliberate browser opt-out for an unset account', () => {
    expect(
      shouldPersistBrowserPreference({
        browserPreference: { enabled: false, explicitConsent: 'denied' },
        storedPreference: null,
      })
    ).toBe(true)
  })
})
