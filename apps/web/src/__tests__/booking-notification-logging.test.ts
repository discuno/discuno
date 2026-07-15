import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('~/env', () => ({
  env: {
    ADMIN_ALERT_EMAIL: 'admin@example.com',
    AUTH_EMAIL_FROM: 'Discuno <noreply@example.com>',
  },
}))
vi.mock('~/lib/emails', () => ({
  resend: { emails: { send: mocks.send } },
}))
vi.mock('~/lib/emails/templates/BookingConfirmation', () => ({
  BookingConfirmationEmail: vi.fn(() => null),
}))
vi.mock('~/lib/emails/templates/BookingFailure', () => ({
  BookingFailureEmail: vi.fn(() => null),
}))
vi.mock('~/lib/emails/templates/PayoutNotification', () => ({
  PayoutNotificationEmail: vi.fn(() => null),
}))
vi.mock('~/lib/emails/templates/RefundNotification', () => ({
  RefundNotificationEmail: vi.fn(() => null),
}))
vi.mock('~/lib/emails/templates/AdminAlert', () => ({ AdminAlertEmail: vi.fn(() => null) }))
vi.mock('~/lib/emails/templates/AdminManualRefundAlert', () => ({
  AdminManualRefundAlertEmail: vi.fn(() => null),
}))

import {
  sendBookingConfirmationEmail,
  sendBookingFailureEmail,
  sendPayoutNotificationEmail,
  sendRefundNotificationEmail,
} from '~/lib/emails/booking-notifications'

describe('booking notification logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.send.mockResolvedValue({ data: { id: 'email_test_1' }, error: null })
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not write recipient email addresses or names to operational logs', async () => {
    await sendBookingConfirmationEmail({
      attendeeEmail: 'attendee.private@example.com',
      mentorEmail: 'mentor.private@example.com',
      booking: {
        id: 42,
        title: 'Private mentoring topic',
        attendeeName: 'Private Attendee',
        organizerName: 'Private Mentor',
        startTime: '2026-08-01T12:00:00.000Z',
      },
    })
    await sendRefundNotificationEmail({
      customerEmail: 'customer.private@example.com',
      amount: 533,
      reason: 'early cancellation',
    })
    await sendPayoutNotificationEmail({
      mentorEmail: 'payout.private@example.com',
      amount: 425,
      currency: 'USD',
      transferId: 'tr_test_safe',
    })
    await sendBookingFailureEmail({
      attendeeEmail: 'failure.private@example.com',
      attendeeName: 'Failure Attendee',
      mentorName: 'Failure Mentor',
      reason: 'Provider unavailable',
      refundSucceeded: true,
    })

    const logs = JSON.stringify(vi.mocked(console.log).mock.calls)
    for (const privateValue of [
      'attendee.private@example.com',
      'mentor.private@example.com',
      'customer.private@example.com',
      'payout.private@example.com',
      'failure.private@example.com',
      'Private Attendee',
      'Private Mentor',
      'Failure Attendee',
      'Failure Mentor',
      'Private mentoring topic',
    ]) {
      expect(logs).not.toContain(privateValue)
    }
  })
})
