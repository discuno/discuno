import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  otpEmail: vi.fn(() => ({ type: 'otp-email' })),
  render: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('react-email', () => ({ render: mocks.render }))
vi.mock('~/lib/emails', () => ({ sendEmail: mocks.sendEmail }))
vi.mock('~/lib/emails/templates/OtpEmail', () => ({ OtpEmail: mocks.otpEmail }))

import { sendAuthOtpEmail, type AuthOtpEmailType } from './otp-email'

const input = {
  authSecret: 'a'.repeat(32),
  email: 'private.user@example.edu',
  from: 'Discuno <auth@discuno.test>',
  otp: '123456',
  type: 'sign-in' as AuthOtpEmailType,
}

describe('authentication OTP email delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.render.mockResolvedValue('<p>OTP</p>')
    mocks.sendEmail.mockResolvedValue('email_123')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['sign-in', 'Sign in to Discuno'],
    ['email-verification', 'Verify your email'],
    ['forget-password', 'Reset your password'],
    ['change-email', 'Confirm your new email'],
  ] as const)('uses the correct subject for %s codes', async (type, subject) => {
    await sendAuthOtpEmail({ ...input, type })

    expect(mocks.otpEmail).toHaveBeenCalledWith({ code: input.otp, host: 'Discuno' })
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      {
        from: input.from,
        to: input.email,
        subject,
        html: '<p>OTP</p>',
      },
      expect.stringMatching(/^auth-otp\/[A-Za-z0-9_-]+$/)
    )

    const idempotencyKey = mocks.sendEmail.mock.calls[0]?.[1] as string
    expect(idempotencyKey).not.toContain(input.email)
    expect(idempotencyKey).not.toContain(input.otp)
  })

  it('contains provider failures and logs only their fixed error kind', async () => {
    const privateDetail = `Resend rejected ${input.email} for OTP ${input.otp}`
    mocks.sendEmail.mockRejectedValue(new Error(privateDetail))

    await expect(sendAuthOtpEmail(input)).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith('[Auth OTP] Email delivery failed', {
      errorKind: 'Error',
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain(privateDetail)
    expect(logged).not.toContain(input.email)
    expect(logged).not.toContain(input.otp)
  })
})
