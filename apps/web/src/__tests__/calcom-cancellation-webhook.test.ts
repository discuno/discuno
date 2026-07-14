import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const WEBHOOK_SECRET = 'cal_test_webhook_secret'
const mentorUserId = '11111111-1111-4111-8111-111111111111'
const actorUserId = '22222222-2222-4222-8222-222222222222'

const mocks = vi.hoisted(() => ({
  cancelLocalBooking: vi.fn(),
  createAnalyticsEvent: vi.fn(),
  getCalcomBooking: vi.fn(),
  getUserIdByCalcomUserId: vi.fn(),
  refundBookingPayment: vi.fn(),
  scheduleBookingMentorPayout: vi.fn(),
  setLocalBookingMentorPayoutEligibility: vi.fn(),
  trackServerEvent: vi.fn(),
}))

vi.mock('~/env', () => ({ env: { CALCOM_WEBHOOK_SECRET: 'cal_test_webhook_secret' } }))
vi.mock('~/lib/calcom', () => ({ getCalcomBooking: mocks.getCalcomBooking }))
vi.mock('~/lib/posthog-server', () => ({ trackServerEvent: mocks.trackServerEvent }))
vi.mock('~/lib/services/booking-service', () => ({
  cancelLocalBooking: mocks.cancelLocalBooking,
  completeLocalBooking: vi.fn(),
  createLocalBooking: vi.fn(),
  setLocalBookingMentorPayoutEligibility: mocks.setLocalBookingMentorPayoutEligibility,
  updateLocalBookingStatus: vi.fn(),
}))
vi.mock('~/lib/services/calcom-tokens-service', () => ({
  getUserIdByCalcomUserId: mocks.getUserIdByCalcomUserId,
}))
vi.mock('~/lib/services/payment-service', () => ({
  refundBookingPayment: mocks.refundBookingPayment,
  scheduleBookingMentorPayout: mocks.scheduleBookingMentorPayout,
  scheduleMentorPayout: vi.fn(),
  updatePaymentPayoutEligibility: vi.fn(),
}))
vi.mock('~/server/dal/analytics', () => ({ createAnalyticsEvent: mocks.createAnalyticsEvent }))

import { POST } from '~/app/api/webhooks/cal/route'

const cancellationPayload = ({
  startTime,
  cancelledByEmail = 'mentee@example.com',
}: {
  startTime: string
  cancelledByEmail?: string
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
}: {
  createdAt?: string
  startTime: string
}) => {
  const body = JSON.stringify({
    triggerEvent: 'BOOKING_CANCELLED',
    ...(createdAt ? { createdAt } : {}),
    payload: cancellationPayload({ startTime }),
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

  it('rejects a cancellation without an authoritative event timestamp for retry', async () => {
    const response = await sendCancellation({ startTime: '2026-01-02T12:00:00.000Z' })

    expect(response.status).toBe(500)
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
    expect(mocks.scheduleBookingMentorPayout).not.toHaveBeenCalled()
  })
})
