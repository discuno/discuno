import { describe, expect, it, vi } from 'vitest'
import {
  AUTH_EMAIL_OTP_COARSE_RATE_LIMIT,
  AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT,
  authErrorKind,
  createAuthLogReference,
  createOtpDeliveryIdempotencyKey,
  createOtpRecipientRateLimitKey,
  getAuthOtpRecipient,
  hashAuthOtp,
  isAnonymousAuthEmail,
  requireOtpRecipientSendAllowance,
} from './security'

describe('auth security helpers', () => {
  it('uses a keyed, deterministic digest for OTP storage', () => {
    const digest = hashAuthOtp('123456', 'a'.repeat(32))

    expect(digest).toBe(hashAuthOtp('123456', 'a'.repeat(32)))
    expect(digest).not.toContain('123456')
    expect(digest).not.toBe(hashAuthOtp('123456', 'b'.repeat(32)))
  })

  it('redacts error details down to their kind', () => {
    expect(authErrorKind(new TypeError('user@example.com'))).toBe('TypeError')
    const error = new Error('private detail')
    error.name = 'private.user@example.com'
    expect(authErrorKind(error)).toBe('Error')
    expect(authErrorKind('user@example.com')).toBe('UnknownError')
  })

  it('creates a stable Better Auth log reference without retaining provider details', () => {
    const privateMessage = 'OAuth failed for private.user@example.com with token secret-value'
    const reference = createAuthLogReference(privateMessage)

    expect(reference).toBe(createAuthLogReference(privateMessage))
    expect(reference).toMatch(/^[a-f0-9]{16}$/)
    expect(reference).not.toContain('private.user@example.com')
    expect(reference).not.toContain('secret-value')
  })

  it('creates an attempt-specific email key without exposing PII or the OTP', () => {
    const key = createOtpDeliveryIdempotencyKey(
      'Student@Example.edu',
      '123456',
      'sign-in',
      'a'.repeat(32)
    )

    expect(key).toBe(
      createOtpDeliveryIdempotencyKey('student@example.edu', '123456', 'sign-in', 'a'.repeat(32))
    )
    expect(key).not.toContain('student')
    expect(key).not.toContain('example.edu')
    expect(key).not.toContain('123456')
  })

  it('uses a larger coarse bucket plus a stricter privacy-preserving recipient bucket', () => {
    expect(AUTH_EMAIL_OTP_COARSE_RATE_LIMIT).toEqual({ max: 30, windowSeconds: 300 })
    expect(AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT).toEqual({ max: 3, window: '15 m' })

    const key = createOtpRecipientRateLimitKey(' Student@Example.edu ', 'a'.repeat(32))
    expect(key).toBe(createOtpRecipientRateLimitKey('student@example.edu', 'a'.repeat(32)))
    expect(key).not.toBe(createOtpRecipientRateLimitKey('student@example.edu', 'b'.repeat(32)))
    expect(key).not.toContain('student')
    expect(key).not.toContain('example.edu')
  })

  it('blocks recipient delivery without exposing the recipient in the error', async () => {
    const consume = vi.fn().mockResolvedValue({ success: false })

    await expect(
      requireOtpRecipientSendAllowance('private.user@example.edu', 'a'.repeat(32), consume)
    ).rejects.toMatchObject({ status: 'TOO_MANY_REQUESTS' })

    const identifier = consume.mock.calls[0]?.[0]
    expect(identifier).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(identifier).not.toContain('private.user@example.edu')
  })

  it('allows recipient delivery inside the dedicated send limit', async () => {
    const consume = vi.fn().mockResolvedValue({ success: true })

    await expect(
      requireOtpRecipientSendAllowance('student@example.edu', 'a'.repeat(32), consume)
    ).resolves.toBeUndefined()
  })

  it('selects every OTP-sending endpoint before its handler stores a code', () => {
    expect(
      getAuthOtpRecipient('/email-otp/send-verification-otp', {
        email: 'student@example.edu',
      })
    ).toBe('student@example.edu')
    expect(
      getAuthOtpRecipient('/email-otp/request-password-reset', {
        email: 'student@example.edu',
      })
    ).toBe('student@example.edu')
    expect(
      getAuthOtpRecipient('/forget-password/email-otp', {
        email: 'student@example.edu',
      })
    ).toBe('student@example.edu')
    expect(
      getAuthOtpRecipient('/email-otp/request-email-change', {
        newEmail: 'next@example.edu',
      })
    ).toBe('next@example.edu')
  })

  it('does not consume recipient send limits for verification or malformed requests', () => {
    expect(
      getAuthOtpRecipient('/sign-in/email-otp', {
        email: 'student@example.edu',
        otp: '123456',
      })
    ).toBeNull()
    expect(getAuthOtpRecipient('/email-otp/send-verification-otp', { email: '   ' })).toBeNull()
    expect(getAuthOtpRecipient(undefined, null)).toBeNull()
  })

  it('distinguishes Better Auth guest addresses from real company addresses', () => {
    expect(isAnonymousAuthEmail('temp-01abc@discuno.com')).toBe(true)
    expect(isAnonymousAuthEmail('TEMP-01ABC@DISCUNO.COM')).toBe(true)
    expect(isAnonymousAuthEmail('support@discuno.com')).toBe(false)
    expect(isAnonymousAuthEmail('temp-user@discuno.com.attacker.example')).toBe(false)
  })
})
