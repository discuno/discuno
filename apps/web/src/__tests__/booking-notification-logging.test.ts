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
  sendEmail: mocks.send,
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
  alertAdminForManualRefund,
  sendAdminAlert,
  sendBookingConfirmationEmail,
  sendBookingFailureEmail,
  sendOperationalAlert,
  sendPayoutNotificationEmail,
  sendRefundNotificationEmail,
} from '~/lib/emails/booking-notifications'

const getOperationalLogs = () =>
  JSON.stringify([
    ...vi.mocked(console.log).mock.calls,
    ...vi.mocked(console.info).mock.calls,
    ...vi.mocked(console.warn).mock.calls,
    ...vi.mocked(console.error).mock.calls,
  ])

describe('booking notification logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.send.mockResolvedValue('email_test_1')
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
      paymentId: 42,
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
      paymentId: 42,
      attendeeEmail: 'failure.private@example.com',
      attendeeName: 'Failure Attendee',
      mentorName: 'Failure Mentor',
      reason: 'Provider unavailable',
      refundSucceeded: true,
    })

    const logs = getOperationalLogs()
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

  it('logs only controlled error names when notification delivery fails', async () => {
    const privateError = 'smtp key secret-value for private.user@example.com'
    mocks.send.mockRejectedValue(new Error(privateError))

    await sendBookingConfirmationEmail({
      attendeeEmail: 'private.user@example.com',
      mentorEmail: 'mentor.private@example.com',
      booking: {
        id: 42,
        title: 'Private subject',
        attendeeName: 'Private Attendee',
        organizerName: 'Private Mentor',
        startTime: '2026-08-01T12:00:00.000Z',
      },
    })
    await sendRefundNotificationEmail({
      paymentId: 42,
      customerEmail: 'private.user@example.com',
      amount: 533,
      reason: 'private refund reason',
    })
    await sendPayoutNotificationEmail({
      mentorEmail: 'mentor.private@example.com',
      amount: 425,
      currency: 'USD',
      transferId: 'tr_private_identifier',
    })
    await sendBookingFailureEmail({
      paymentId: 42,
      attendeeEmail: 'private.user@example.com',
      attendeeName: 'Private Attendee',
      mentorName: 'Private Mentor',
      reason: 'private failure reason',
      refundSucceeded: false,
    })
    await alertAdminForManualRefund(
      'cs_private_identifier',
      new Error('private booking failure'),
      new Error('private refund failure')
    )
    await sendAdminAlert({
      type: 'PAYMENT_REVIEW',
      paymentId: 42,
      error: 'private admin error',
    })
    await sendOperationalAlert({
      type: 'DELIVERY_FAILURE',
      reference: 'private_reference',
      summary: 'private operational summary',
    })

    const logs = getOperationalLogs()
    for (const privateValue of [
      privateError,
      'private.user@example.com',
      'mentor.private@example.com',
      'Private Attendee',
      'Private Mentor',
      'Private subject',
      'private refund reason',
      'tr_private_identifier',
      'private failure reason',
      'cs_private_identifier',
      'private booking failure',
      'private refund failure',
      'private admin error',
      'private_reference',
      'private operational summary',
    ]) {
      expect(logs).not.toContain(privateValue)
    }
    expect(logs).toContain('errorName')
    expect(logs).toContain('Error')
  })
})
