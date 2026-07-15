import { describe, expect, it } from 'vitest'
import { getSafeErrorName } from '~/lib/operational-logging'

describe('operational log redaction', () => {
  it('uses fixed categories rather than mutable error details', () => {
    const error = new Error('private.user@example.com secret-value')
    error.name = 'private.user@example.com secret-value'
    Object.defineProperty(error, 'constructor', {
      value: { name: 'PrivateSecretError' },
    })

    expect(getSafeErrorName(error)).toBe('Error')
    expect(getSafeErrorName(new TypeError('private detail'))).toBe('TypeError')
    expect(getSafeErrorName(new (class ProviderTimeoutError extends Error {})())).toBe('Error')
    expect(getSafeErrorName({ name: 'ForgedError', message: 'private detail' })).toBe(
      'UnknownError'
    )
  })
})
