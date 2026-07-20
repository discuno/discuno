import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClientAnalyticsConsentSnapshot, setClientAnalyticsConsentState } from './client-consent'

const mocks = vi.hoisted(() => ({
  getExplicitConsentStatus: vi.fn(),
  optInCapturing: vi.fn(),
  optOutCapturing: vi.fn(),
  setConfig: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  config: { respect_dnt: true },
}))

vi.mock('posthog-js', () => ({
  default: {
    config: mocks.config,
    get_explicit_consent_status: mocks.getExplicitConsentStatus,
    opt_in_capturing: mocks.optInCapturing,
    opt_out_capturing: mocks.optOutCapturing,
    set_config: mocks.setConfig,
    startSessionRecording: mocks.startSessionRecording,
    stopSessionRecording: mocks.stopSessionRecording,
  },
}))

import { applyClientAnalyticsPreference, getBrowserAnalyticsPreference } from './client-posthog'

describe('client PostHog consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.config.respect_dnt = true
    mocks.getExplicitConsentStatus.mockReturnValue('pending')
    setClientAnalyticsConsentState('pending')
  })

  it('defaults an unset browser preference to analytics disabled', () => {
    expect(getBrowserAnalyticsPreference()).toEqual({
      enabled: false,
      explicitConsent: 'pending',
    })
    expect(mocks.setConfig).toHaveBeenNthCalledWith(1, { respect_dnt: false })
    expect(mocks.setConfig).toHaveBeenNthCalledWith(2, { respect_dnt: true })
  })

  it('keeps an explicit grant enabled even when DNT is present', () => {
    mocks.getExplicitConsentStatus.mockReturnValue('granted')

    expect(getBrowserAnalyticsPreference()).toEqual({
      enabled: true,
      explicitConsent: 'granted',
    })
  })

  it('keeps the SDK opted out when the default-disabled state is not an explicit choice', () => {
    applyClientAnalyticsPreference(false, { persistChoice: false })

    expect(getClientAnalyticsConsentSnapshot()).toBe('disabled')
    expect(mocks.optInCapturing).not.toHaveBeenCalled()
    expect(mocks.optOutCapturing).not.toHaveBeenCalled()
    expect(mocks.setConfig).toHaveBeenCalledWith({ respect_dnt: true })
    expect(mocks.startSessionRecording).not.toHaveBeenCalled()
    expect(mocks.stopSessionRecording).toHaveBeenCalledOnce()
  })

  it('allows a deliberate opt-in to override DNT', () => {
    applyClientAnalyticsPreference(true)

    expect(getClientAnalyticsConsentSnapshot()).toBe('enabled')
    expect(mocks.setConfig).toHaveBeenCalledWith({ respect_dnt: false })
    expect(mocks.optInCapturing).toHaveBeenCalledWith({ captureEventName: false })
  })

  it('stops recording before persisting an opt-out', () => {
    applyClientAnalyticsPreference(false)

    expect(getClientAnalyticsConsentSnapshot()).toBe('disabled')
    expect(mocks.stopSessionRecording).toHaveBeenCalledOnce()
    expect(mocks.optOutCapturing).toHaveBeenCalledOnce()
  })
})
