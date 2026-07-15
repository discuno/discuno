import { createHash, createHmac } from 'node:crypto'
import { APIError } from 'better-auth/api'
import { getSafeErrorName } from '~/lib/operational-logging'

export const AUTH_EMAIL_OTP_COARSE_RATE_LIMIT = {
  max: 30,
  windowSeconds: 5 * 60,
} as const

export const AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT = {
  max: 3,
  window: '15 m',
} as const

/**
 * Hash a short OTP with a server secret. A plain SHA-256 digest of a six-digit
 * code can be exhaustively searched after a database leak; HMAC keeps that
 * search infeasible without the application secret.
 */
export const hashAuthOtp = (otp: string, secret: string): string =>
  createHmac('sha256', secret)
    .update('discuno:auth-otp-storage:v1\0', 'utf8')
    .update(otp, 'utf8')
    .digest('base64url')

/** A retry-stable Resend key that never exposes the recipient or OTP. */
export const createOtpDeliveryIdempotencyKey = (
  email: string,
  otp: string,
  type: string,
  secret: string
): string => {
  const digest = createHmac('sha256', secret)
    .update(`discuno:auth-otp-delivery:v1\0${type}\0${email.trim().toLowerCase()}\0${otp}`, 'utf8')
    .digest('base64url')

  return `auth-otp/${digest}`
}

/**
 * Derive a privacy-preserving recipient bucket. Upstash sees only a keyed
 * digest, so neither its rate-limit keys nor analytics retain the address.
 */
export const createOtpRecipientRateLimitKey = (email: string, secret: string): string =>
  createHmac('sha256', secret)
    .update('discuno:auth-otp-recipient-rate-limit:v1\0', 'utf8')
    .update(email.trim().toLowerCase(), 'utf8')
    .digest('base64url')

const OTP_RECIPIENT_FIELDS: Readonly<Record<string, 'email' | 'newEmail'>> = {
  '/email-otp/send-verification-otp': 'email',
  '/email-otp/request-password-reset': 'email',
  // Retain protection for Better Auth's deprecated compatibility endpoint
  // until the upstream major version removes it.
  '/forget-password/email-otp': 'email',
  '/email-otp/request-email-change': 'newEmail',
}

/** Select only requests that can send an OTP, before the endpoint stores one. */
export const getAuthOtpRecipient = (path: string | undefined, body: unknown): string | null => {
  if (!path || !body || typeof body !== 'object') return null

  const field = OTP_RECIPIENT_FIELDS[path]
  if (!field) return null

  const value = (body as Record<string, unknown>)[field]
  return typeof value === 'string' && value.trim() ? value : null
}

type OtpRecipientLimit = (identifier: string) => Promise<{ success: boolean }>

/** Fail closed before delivering another code to a rate-limited recipient. */
export const requireOtpRecipientSendAllowance = async (
  email: string,
  secret: string,
  consume: OtpRecipientLimit
): Promise<void> => {
  const result = await consume(createOtpRecipientRateLimitKey(email, secret))
  if (!result.success) {
    throw new APIError('TOO_MANY_REQUESTS', {
      message: 'Too many verification codes requested. Please try again later.',
    })
  }
}

/** Correlate provider logs without retaining Better Auth's potentially sensitive message. */
export const createAuthLogReference = (message: string): string =>
  createHash('sha256').update(message, 'utf8').digest('hex').slice(0, 16)

export const authErrorKind = (error: unknown): string => getSafeErrorName(error)

/** Match only the synthetic address shape produced by Better Auth's anonymous plugin. */
export const isAnonymousAuthEmail = (email: string, domain = 'discuno.com'): boolean => {
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^temp-[^@]+@${escapedDomain}$`, 'i').test(email.trim())
}
