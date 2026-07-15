import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/env', () => ({
  env: {
    CALCOM_API_URL: 'https://api.cal.test/v2///',
  },
}))

import {
  CALCOM_REQUEST_TIMEOUT_MS,
  getCalcomApiUrl,
  getCalcomRequestSignal,
} from '~/lib/calcom/transport'

describe('Cal.com HTTP transport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes base and path slashes without changing the API base path', () => {
    expect(getCalcomApiUrl('/auth/oauth2/token')).toBe('https://api.cal.test/v2/auth/oauth2/token')
    expect(getCalcomApiUrl('me')).toBe('https://api.cal.test/v2/me')
  })

  it('creates a bounded provider signal with the configured timeout', () => {
    const timeoutSignal = new AbortController().signal
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal)

    expect(getCalcomRequestSignal()).toBe(timeoutSignal)
    expect(CALCOM_REQUEST_TIMEOUT_MS).toBe(15_000)
    expect(timeoutSpy).toHaveBeenCalledOnce()
    expect(timeoutSpy).toHaveBeenCalledWith(15_000)
  })

  it('composes the timeout with a caller signal so caller cancellation is preserved', () => {
    const caller = new AbortController()
    const timeout = new AbortController()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal)

    const combined = getCalcomRequestSignal(caller.signal)
    expect(combined.aborted).toBe(false)

    caller.abort()
    expect(combined.aborted).toBe(true)
  })
})
