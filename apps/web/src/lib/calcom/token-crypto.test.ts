import { beforeEach, describe, expect, it, vi } from 'vitest'

const CURRENT_KEY = Buffer.alloc(32, 1).toString('base64')
const NEXT_KEY = Buffer.alloc(32, 2).toString('base64')

const mocks = vi.hoisted(() => ({
  env: {
    CALCOM_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS: undefined as string | undefined,
  },
}))

vi.mock('~/env', () => ({ env: mocks.env }))

import { decryptCalcomToken, encryptCalcomToken } from '~/lib/calcom/token-crypto'

describe('Cal.com OAuth credential encryption', () => {
  beforeEach(() => {
    mocks.env.CALCOM_TOKEN_ENCRYPTION_KEY = CURRENT_KEY
    mocks.env.CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS = undefined
  })

  it('round-trips a token in a versioned authenticated envelope', () => {
    const encrypted = encryptCalcomToken('cal-secret-token', 'user-a')

    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(encrypted).not.toContain('cal-secret-token')
    expect(decryptCalcomToken(encrypted, 'user-a')).toBe('cal-secret-token')
  })

  it('uses a fresh nonce for every encrypted credential', () => {
    const first = encryptCalcomToken('same-token', 'user-a')
    const second = encryptCalcomToken('same-token', 'user-a')

    expect(first).not.toBe(second)
    expect(decryptCalcomToken(first, 'user-a')).toBe('same-token')
    expect(decryptCalcomToken(second, 'user-a')).toBe('same-token')
  })

  it('binds ciphertext to the Discuno user with authenticated additional data', () => {
    const encrypted = encryptCalcomToken('cal-secret-token', 'user-a')

    expect(() => decryptCalcomToken(encrypted, 'user-b')).toThrow(
      'Stored Cal.com credential could not be decrypted'
    )
  })

  it('rejects tampering without including credential material in the error', () => {
    const encrypted = encryptCalcomToken('cal-secret-token', 'user-a')
    const parts = encrypted.split('.')
    const encodedCiphertext = parts[3]
    if (!encodedCiphertext) throw new TypeError('Expected encrypted credential ciphertext')
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url')
    ciphertext[0] = (ciphertext[0] ?? 0) ^ 1
    parts[3] = ciphertext.toString('base64url')
    const tampered = parts.join('.')

    let thrown: unknown
    try {
      decryptCalcomToken(tampered, 'user-a')
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toBe('Stored Cal.com credential could not be decrypted')
    expect((thrown as Error).message).not.toContain('cal-secret-token')
    expect((thrown as Error).message).not.toContain(tampered)
  })

  it('decrypts with the previous key during zero-downtime key rotation', () => {
    const encryptedWithOldKey = encryptCalcomToken('cal-secret-token', 'user-a')
    mocks.env.CALCOM_TOKEN_ENCRYPTION_KEY = NEXT_KEY
    mocks.env.CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS = CURRENT_KEY

    expect(decryptCalcomToken(encryptedWithOldKey, 'user-a')).toBe('cal-secret-token')
  })

  it('fails fast when the active encryption key is not exactly 32 bytes', () => {
    mocks.env.CALCOM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(31).toString('base64')

    expect(() => encryptCalcomToken('cal-secret-token', 'user-a')).toThrow(
      'CALCOM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key'
    )
  })

  it('rejects unsupported credential envelope versions with a redacted error', () => {
    const encrypted = encryptCalcomToken('cal-secret-token', 'user-a').replace(/^v1\./, 'v2.')

    expect(() => decryptCalcomToken(encrypted, 'user-a')).toThrow(
      'Stored Cal.com credential could not be decrypted'
    )
  })
})
