import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const WEBHOOK_SECRET = 'cal_test_webhook_secret'
const mentorUserId = '11111111-1111-4111-8111-111111111111'
const actorUserId = '22222222-2222-4222-8222-222222222222'

const mocks = vi.hoisted(() => ({
  cancelLocalBooking: vi.fn(),
  createAnalyticsEvent: vi.fn(),
  createLocalBooking: vi.fn(),
  getCalcomBooking: vi.fn(),
  getUserIdByCalcomUserId: vi.fn(),
  holdBookingPaymentForManualReview: vi.fn(),
  refundBookingPayment: vi.fn(),
  scheduleBookingMentorPayout: vi.fn(),
  scheduleMentorPayout: vi.fn(),
  setLocalBookingMentorPayoutEligibility: vi.fn(),
  trackServerEvent: vi.fn(),
  updatePaymentPayoutEligibility: vi.fn(),
}))

vi.mock('~/env', () => ({ env: { CALCOM_WEBHOOK_SECRET: 'cal_test_webhook_secret' } }))
vi.mock('~/lib/calcom', () => ({ getCalcomBooking: mocks.getCalcomBooking }))
vi.mock('~/lib/posthog-server', () => ({ trackServerEvent: mocks.trackServerEvent }))
vi.mock('~/lib/services/booking-service', () => ({
  cancelLocalBooking: mocks.cancelLocalBooking,
  completeLocalBooking: vi.fn(),
  createLocalBooking: mocks.createLocalBooking,
  setLocalBookingMentorPayoutEligibility: mocks.setLocalBookingMentorPayoutEligibility,
  updateLocalBookingStatus: vi.fn(),
}))
vi.mock('~/lib/services/calcom-tokens-service', () => ({
  getUserIdByCalcomUserId: mocks.getUserIdByCalcomUserId,
}))
vi.mock('~/lib/services/payment-service', () => ({
  holdBookingPaymentForManualReview: mocks.holdBookingPaymentForManualReview,
  refundBookingPayment: mocks.refundBookingPayment,
  scheduleBookingMentorPayout: mocks.scheduleBookingMentorPayout,
  scheduleMentorPayout: mocks.scheduleMentorPayout,
  updatePaymentPayoutEligibility: mocks.updatePaymentPayoutEligibility,
}))
vi.mock('~/server/dal/analytics', () => ({ createAnalyticsEvent: mocks.createAnalyticsEvent }))

import { POST } from '~/app/api/webhooks/cal/route'

const cancellationPayload = ({
  startTime,
  cancelledByEmail = 'mentee@example.com',
}: {
  startTime: string
  cancelledByEmail?: string | null
}) => {
  const start = new Date(startTime)
  return {
    type: 'standard-event-type',
    title: 'Discuno mentor session',
    startTime,
    endTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    organizer: {
      id: 42,
      name: 'Mentor',
      email: 'mentor@example.com',
      username: 'mentor',
      timeZone: 'UTC',
    },
    responses: {},
    attendees: [
      {
        email: 'mentee@example.com',
        name: 'Mentee',
        timeZone: 'UTC',
      },
    ],
    eventTypeId: 123,
    uid: 'booking-cancelled',
    length: 60,
    bookingId: 456,
    cancelledByEmail,
    metadata: { mentorUserId, actorUserId },
    status: 'CANCELLED',
  }
}

const sendCancellation = async ({
  createdAt,
  startTime,
  cancelledByEmail,
}: {
  createdAt?: string
  startTime: string
  cancelledByEmail?: string | null
}) => {
  const body = JSON.stringify({
    triggerEvent: 'BOOKING_CANCELLED',
    ...(createdAt ? { createdAt } : {}),
    payload: cancellationPayload({
      startTime,
      ...(cancelledByEmail !== undefined ? { cancelledByEmail } : {}),
    }),
  })
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  return POST(
    new Request('https://preview.discuno.com/api/webhooks/cal', {
      method: 'POST',
      headers: { 'x-cal-signature-256': signature },
      body,
    })
  )
}

describe('Cal.com cancellation financial disposition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cancelLocalBooking.mockResolvedValue({
      id: 7,
      missing: false,
      transitioned: true,
    })
    mocks.getUserIdByCalcomUserId.mockResolvedValue(mentorUserId)
    mocks.createLocalBooking.mockResolvedValue({
      booking: { id: 7, paymentId: null },
      created: true,
    })
    mocks.getCalcomBooking.mockResolvedValue({
      cancelledByEmail: null,
      hosts: [{ email: 'mentor@example.com' }],
      attendees: [{ email: 'mentee@example.com' }],
    })
    mocks.holdBookingPaymentForManualReview.mockResolvedValue({ success: true })
    mocks.refundBookingPayment.mockResolvedValue({ success: true })
    mocks.scheduleBookingMentorPayout.mockResolvedValue({ success: true })
    mocks.setLocalBookingMentorPayoutEligibility.mockResolvedValue({ id: 7 })
    mocks.createAnalyticsEvent.mockResolvedValue(undefined)
    mocks.trackServerEvent.mockResolvedValue(undefined)
  })

  it('uses the Cal event time for the inclusive 24-hour refund boundary', async () => {
    const response = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(mocks.setLocalBookingMentorPayoutEligibility).toHaveBeenCalledWith(
      'booking-cancelled',
      false
    )
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith(
      'booking-cancelled',
      'early_cancellation'
    )
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
  })

  it('marks a late mentee cancellation payout-eligible and schedules the 85% payout', async () => {
    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(mocks.setLocalBookingMentorPayoutEligibility).toHaveBeenCalledWith(
      'booking-cancelled',
      true
    )
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
    expect(mocks.scheduleBookingMentorPayout).toHaveBeenCalledWith(
      'booking-cancelled',
      'late-mentee-cancellation'
    )
  })

  it('refunds an early API cancellation when Cal.com omits actor attribution', async () => {
    mocks.getCalcomBooking.mockRejectedValue(new Error('Cal unavailable'))
    const response = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: '',
    })

    expect(response.status).toBe(200)
    expect(mocks.getCalcomBooking).not.toHaveBeenCalled()
    expect(mocks.setLocalBookingMentorPayoutEligibility).toHaveBeenCalledWith(
      'booking-cancelled',
      false
    )
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith(
      'booking-cancelled',
      'early_cancellation'
    )
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
  })

  it('holds a late cancellation when Cal.com omits actor attribution', async () => {
    mocks.getCalcomBooking.mockRejectedValue(new Error('Cal unavailable'))
    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: '',
    })

    expect(response.status).toBe(200)
    expect(mocks.getCalcomBooking).toHaveBeenCalledWith('booking-cancelled')
    expect(mocks.holdBookingPaymentForManualReview).toHaveBeenCalledWith(
      'booking-cancelled',
      'late cancellation could not be attributed to a host or attendee'
    )
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
    expect(mocks.setLocalBookingMentorPayoutEligibility).toHaveBeenCalledWith(
      'booking-cancelled',
      false
    )
  })

  it('refunds a late co-host cancellation instead of treating the host as a mentee', async () => {
    mocks.getCalcomBooking.mockResolvedValue({
      cancelledByEmail: 'cohost@example.com',
      hosts: [{ email: 'mentor@example.com' }, { email: 'cohost@example.com' }],
      attendees: [{ email: 'mentee@example.com' }],
    })

    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: 'cohost@example.com',
    })

    expect(response.status).toBe(200)
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith('booking-cancelled', 'mentor_cancelled')
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
    expect(mocks.holdBookingPaymentForManualReview).not.toHaveBeenCalled()
  })

  it('holds a late cancellation attributed to an unknown email', async () => {
    mocks.getCalcomBooking.mockResolvedValue({
      cancelledByEmail: 'integration@example.com',
      hosts: [{ email: 'mentor@example.com' }],
      attendees: [{ email: 'mentee@example.com' }],
    })

    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: 'integration@example.com',
    })

    expect(response.status).toBe(200)
    expect(mocks.holdBookingPaymentForManualReview).toHaveBeenCalledOnce()
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
  })

  it('rejects a cancellation without an authoritative event timestamp for retry', async () => {
    const response = await sendCancellation({ startTime: '2026-01-02T12:00:00.000Z' })

    expect(response.status).toBe(500)
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
  })

  it('preserves a pending Cal.com booking status instead of accepting it locally', async () => {
    const body = JSON.stringify({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T12:00:00.000Z',
      payload: {
        ...cancellationPayload({
          startTime: '2026-01-02T12:00:00.000Z',
          cancelledByEmail: null,
        }),
        status: 'PENDING',
      },
    })
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
    const response = await POST(
      new Request('https://preview.discuno.com/api/webhooks/cal', {
        method: 'POST',
        headers: { 'x-cal-signature-256': signature },
        body,
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.createLocalBooking).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' })
    )
  })
})
