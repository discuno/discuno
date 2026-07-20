import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('~/env', () => ({ env: { RESEND_API_KEY: 're_test' } }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send }
  },
}))

import { EmailDeliveryError, sendEmail } from '~/lib/emails'

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes a deterministic idempotency key to Resend', async () => {
    mocks.send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
    const payload = {
      from: 'Discuno <noreply@example.com>',
      to: 'student@example.com',
      subject: 'Test',
      text: 'Hello',
    }

    await expect(sendEmail(payload, 'booking-confirmation/42')).resolves.toBe('email_123')
    expect(mocks.send).toHaveBeenCalledWith(payload, {
      idempotencyKey: 'booking-confirmation/42',
    })
  })

  it('surfaces Resend API errors even when the SDK does not throw', async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'slow down' },
    })

    await expect(
      sendEmail(
        {
          from: 'Discuno <noreply@example.com>',
          to: 'student@example.com',
          subject: 'Test',
          text: 'Hello',
        },
        'refund/42'
      )
    ).rejects.toThrow(EmailDeliveryError)
  })

  it('rejects invalid idempotency keys before making a request', async () => {
    await expect(
      sendEmail(
        {
          from: 'Discuno <noreply@example.com>',
          to: 'student@example.com',
          subject: 'Test',
          text: 'Hello',
        },
        'x'.repeat(257)
      )
    ).rejects.toThrow('Invalid email idempotency key')
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
