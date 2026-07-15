import { describe, expect, it } from 'vitest'
import { getLinkedAnalyticsPreferenceUpdate } from './preference-policy'

describe('anonymous analytics preference conversion', () => {
  it('always carries an anonymous opt-out into the permanent account', () => {
    expect(getLinkedAnalyticsPreferenceUpdate(false, true)).toBe(false)
  })

  it('copies an opt-in only when the permanent account is unset', () => {
    expect(getLinkedAnalyticsPreferenceUpdate(true, null)).toBe(true)
    expect(getLinkedAnalyticsPreferenceUpdate(true, false)).toBeUndefined()
  })

  it('does not manufacture a choice from an unset anonymous preference', () => {
    expect(getLinkedAnalyticsPreferenceUpdate(null, null)).toBeUndefined()
  })
})
