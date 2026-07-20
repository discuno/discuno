import { beforeEach, describe, expect, it, vi } from 'vitest'

const mentorUserId = '11111111-1111-4111-8111-111111111111'
const actorUserId = '22222222-2222-4222-8222-222222222222'
const linkedActorUserId = '33333333-3333-4333-8333-333333333333'

const mocks = vi.hoisted(() => ({
  cancelLocalBooking: vi.fn(),
  createAnalyticsEvent: vi.fn(),
  createLocalBooking: vi.fn(),
  getCalcomBooking: vi.fn(),
  getLocalBookingLifecycleContext: vi.fn(),
  getUserIdByCalcomUserId: vi.fn(),
  holdBookingPaymentForManualReview: vi.fn(),
  refundBookingPayment: vi.fn(),
  recordLocalBookingLifecycle: vi.fn(),
  resolveCanonicalUserId: vi.fn(),
  scheduleBookingMentorPayout: vi.fn(),
  scheduleMentorPayout: vi.fn(),
  setLocalBookingMentorPayoutEligibility: vi.fn(),
  trackServerEvent: vi.fn(),
  updatePaymentPayoutEligibility: vi.fn(),
  dbSelect: vi.fn(),
  paymentLimit: vi.fn(),
  withPaymentOperationLock: vi.fn(),
}))

vi.mock('~/env', () => ({ env: { CALCOM_WEBHOOK_SECRET: 'cal_test_webhook_secret' } }))
vi.mock('~/inngest/client', () => ({ inngest: { send: vi.fn() } }))
vi.mock('~/lib/calcom', () => ({ getCalcomBooking: mocks.getCalcomBooking }))
vi.mock('~/lib/posthog-server', () => ({ trackServerEvent: mocks.trackServerEvent }))
vi.mock('~/lib/services/booking-service', () => ({
  cancelLocalBooking: mocks.cancelLocalBooking,
  completeLocalBooking: vi.fn(),
  createLocalBooking: mocks.createLocalBooking,
  getLocalBookingLifecycleContext: mocks.getLocalBookingLifecycleContext,
  recordLocalBookingLifecycle: mocks.recordLocalBookingLifecycle,
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
  withPaymentOperationLock: mocks.withPaymentOperationLock,
}))
vi.mock('~/server/dal/analytics', () => ({ createAnalyticsEvent: mocks.createAnalyticsEvent }))
vi.mock('~/server/dal/user-identities', () => ({
  resolveCanonicalUserId: mocks.resolveCanonicalUserId,
}))
vi.mock('~/server/db', () => ({
  db: {
    select: mocks.dbSelect,
  },
}))

import { processCalcomWebhookEvent } from '~/app/api/webhooks/cal/route'

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
  const event = {
    triggerEvent: 'BOOKING_CANCELLED',
    ...(createdAt ? { createdAt } : {}),
    payload: cancellationPayload({
      startTime,
      ...(cancelledByEmail !== undefined ? { cancelledByEmail } : {}),
    }),
  }
  return processCalcomWebhookEvent(event)
}

const providerCancellation = ({
  start = '2026-01-02T12:00:00.000Z',
  updatedAt = '2026-01-01T12:00:00.000Z',
  cancelledByEmail = 'mentee@example.com',
  hosts = ['mentor@example.com'],
  attendees = ['mentee@example.com'],
}: {
  start?: string
  updatedAt?: string
  cancelledByEmail?: string | null
  hosts?: string[]
  attendees?: string[]
} = {}) => ({
  id: 456,
  uid: 'booking-cancelled',
  status: 'cancelled',
  start,
  end: new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(),
  duration: 60,
  updatedAt,
  absentHost: false,
  cancelledByEmail,
  hosts: hosts.map(email => ({ email })),
  attendees: attendees.map(email => ({ email, absent: false })),
  metadata: { mentorUserId, actorUserId },
})

describe('Cal.com cancellation financial disposition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cancelLocalBooking.mockResolvedValue({
      id: 7,
      missing: false,
      transitioned: true,
    })
    mocks.getUserIdByCalcomUserId.mockResolvedValue(mentorUserId)
    mocks.getLocalBookingLifecycleContext.mockResolvedValue(null)
    mocks.createLocalBooking.mockResolvedValue({
      booking: { id: 7, paymentId: null },
      lifecycle: { state: 'ACTIVE' },
      created: true,
    })
    mocks.recordLocalBookingLifecycle.mockResolvedValue({
      id: 7,
      missing: false,
      recorded: true,
      transitioned: true,
      lifecycle: { state: 'CANCELLED' },
    })
    mocks.resolveCanonicalUserId.mockResolvedValue(actorUserId)
    mocks.getCalcomBooking.mockResolvedValue(providerCancellation())
    mocks.holdBookingPaymentForManualReview.mockResolvedValue({ success: true })
    mocks.refundBookingPayment.mockResolvedValue({ success: true })
    mocks.scheduleBookingMentorPayout.mockResolvedValue({ success: true })
    mocks.setLocalBookingMentorPayoutEligibility.mockResolvedValue({ id: 7 })
    mocks.createAnalyticsEvent.mockResolvedValue(undefined)
    mocks.trackServerEvent.mockResolvedValue(undefined)
    const paymentBuilder = {
      from: vi.fn(),
      where: vi.fn(),
      limit: mocks.paymentLimit,
    }
    paymentBuilder.from.mockReturnValue(paymentBuilder)
    paymentBuilder.where.mockReturnValue(paymentBuilder)
    mocks.dbSelect.mockReturnValue(paymentBuilder)
    mocks.paymentLimit.mockResolvedValue([])
    mocks.withPaymentOperationLock.mockImplementation(
      async (_paymentId: number, operation: () => Promise<unknown>) => operation()
    )
  })

  it('uses the provider-updated time for the inclusive 24-hour refund boundary', async () => {
    const response = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        calcomUid: 'booking-cancelled',
        state: 'CANCELLED',
        financialDisposition: 'REFUND_EARLY_CANCELLATION',
        mentorPayoutEligible: false,
        eventCreatedAt: new Date('2026-01-01T12:00:00.000Z'),
      })
    )
  })

  it('marks a late mentee cancellation payout-eligible and schedules the 85% payout', async () => {
    mocks.getCalcomBooking.mockResolvedValueOnce(
      providerCancellation({ updatedAt: '2026-01-02T11:00:00.000Z' })
    )
    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        financialDisposition: 'PAYOUT_LATE_CANCELLATION',
        mentorPayoutEligible: true,
      })
    )
  })

  it('refunds an early API cancellation when Cal.com omits actor attribution', async () => {
    mocks.getCalcomBooking.mockResolvedValueOnce(providerCancellation({ cancelledByEmail: null }))
    const response = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: '',
    })

    expect(response.status).toBe(200)
    expect(mocks.getCalcomBooking).toHaveBeenCalledWith('booking-cancelled', mentorUserId)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        financialDisposition: 'REFUND_EARLY_CANCELLATION',
        mentorPayoutEligible: false,
      })
    )
  })

  it('holds a late cancellation when Cal.com omits actor attribution', async () => {
    mocks.getCalcomBooking.mockResolvedValueOnce(
      providerCancellation({
        updatedAt: '2026-01-02T11:00:00.000Z',
        cancelledByEmail: null,
      })
    )
    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: '',
    })

    expect(response.status).toBe(200)
    expect(mocks.getCalcomBooking).toHaveBeenCalledWith('booking-cancelled', mentorUserId)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        financialDisposition: 'HOLD_LATE_CANCELLATION',
        mentorPayoutEligible: false,
      })
    )
  })

  it('refunds a late co-host cancellation instead of treating the host as a mentee', async () => {
    mocks.getCalcomBooking.mockResolvedValue(
      providerCancellation({
        updatedAt: '2026-01-02T11:00:00.000Z',
        cancelledByEmail: 'cohost@example.com',
        hosts: ['mentor@example.com', 'cohost@example.com'],
      })
    )

    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: 'cohost@example.com',
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        financialDisposition: 'REFUND_MENTOR_CANCELLATION',
        mentorPayoutEligible: false,
      })
    )
  })

  it('holds a late cancellation attributed to an unknown email', async () => {
    mocks.getCalcomBooking.mockResolvedValue(
      providerCancellation({
        updatedAt: '2026-01-02T11:00:00.000Z',
        cancelledByEmail: 'integration@example.com',
      })
    )

    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
      cancelledByEmail: 'integration@example.com',
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({ financialDisposition: 'HOLD_LATE_CANCELLATION' })
    )
  })

  it('keeps a provider-confirmed reschedule predecessor financially neutral', async () => {
    mocks.getCalcomBooking
      .mockResolvedValueOnce({
        ...providerCancellation(),
        rescheduledToUid: 'booking-rescheduled-current',
      })
      .mockResolvedValueOnce({
        ...providerCancellation({ start: '2026-01-03T15:00:00.000Z' }),
        id: 457,
        uid: 'booking-rescheduled-current',
        status: 'accepted',
        rescheduledFromUid: 'booking-cancelled',
      })

    const response = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        calcomUid: 'booking-cancelled',
        financialDisposition: 'NONE',
        mentorPayoutEligible: false,
      })
    )
  })

  it('defers every financial decision when Cal.com cannot verify the cancellation', async () => {
    mocks.getCalcomBooking.mockRejectedValueOnce(new Error('Cal unavailable'))

    const response = await sendCancellation({
      createdAt: '2026-01-02T11:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })

    expect(response.status).toBe(500)
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('records a host no-show only after Cal.com confirms the host was absent', async () => {
    mocks.getLocalBookingLifecycleContext.mockResolvedValue({
      expectedMentorUserId: mentorUserId,
      expectedCalcomUserId: 42,
    })
    mocks.getCalcomBooking.mockResolvedValue({
      ...providerCancellation(),
      id: 789,
      uid: 'host-no-show-booking',
      status: 'accepted',
      absentHost: true,
      updatedAt: '2026-01-02T13:05:00.000Z',
    })

    const response = await processCalcomWebhookEvent({
      triggerEvent: 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
      createdAt: '2026-01-02T13:10:00.000Z',
      payload: {
        title: 'Mentor session',
        bookingId: 789,
        bookingUid: 'host-no-show-booking',
        startTime: '2026-01-02T12:00:00.000Z',
        endTime: '2026-01-02T13:00:00.000Z',
        attendees: [{ email: 'mentee@example.com', name: 'Mentee' }],
        participants: [],
        eventType: { id: 123, teamId: null, parentId: null },
        webhook: {
          id: 'host-no-show-hook',
          subscriberUrl: 'https://discuno.test/api/webhooks/cal',
          appId: null,
          time: 5,
          timeUnit: 'MINUTE',
          eventTriggers: ['AFTER_HOSTS_CAL_VIDEO_NO_SHOW'],
          payloadTemplate: null,
        },
        message: 'Host did not join',
      },
    })

    expect(response.status).toBe(200)
    expect(mocks.recordLocalBookingLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'HOST_NO_SHOW',
        financialDisposition: 'REFUND_MENTOR_NO_SHOW',
        eventCreatedAt: new Date('2026-01-02T13:05:00.000Z'),
      })
    )
  })

  it('rejects a forged host no-show when Cal.com reports the host was present', async () => {
    mocks.getLocalBookingLifecycleContext.mockResolvedValue({
      expectedMentorUserId: mentorUserId,
      expectedCalcomUserId: 42,
    })
    mocks.getCalcomBooking.mockResolvedValue({
      ...providerCancellation(),
      id: 789,
      uid: 'host-no-show-booking',
      status: 'accepted',
      absentHost: false,
    })

    const response = await processCalcomWebhookEvent({
      triggerEvent: 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
      createdAt: '2026-01-02T13:10:00.000Z',
      payload: {
        title: 'Mentor session',
        bookingId: 789,
        bookingUid: 'host-no-show-booking',
        startTime: '2026-01-02T12:00:00.000Z',
        endTime: '2026-01-02T13:00:00.000Z',
        attendees: [{ email: 'mentee@example.com', name: 'Mentee' }],
        participants: [],
        eventType: { id: 123, teamId: null, parentId: null },
        webhook: {
          id: 'host-no-show-hook',
          subscriberUrl: 'https://discuno.test/api/webhooks/cal',
          appId: null,
          time: 5,
          timeUnit: 'MINUTE',
          eventTriggers: ['AFTER_HOSTS_CAL_VIDEO_NO_SHOW'],
          payloadTemplate: null,
        },
        message: 'Host did not join',
      },
    })

    expect(response.status).toBe(500)
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('rejects a cancellation without an authoritative event timestamp before classification', async () => {
    const response = await sendCancellation({ startTime: '2026-01-02T12:00:00.000Z' })

    expect(response.status).toBe(422)
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('does not schedule an active payout when BOOKING_CREATED arrives after cancellation', async () => {
    mocks.recordLocalBookingLifecycle.mockResolvedValueOnce({
      id: null,
      missing: true,
      recorded: true,
      transitioned: false,
      lifecycle: { state: 'CANCELLED' },
    })
    const cancellationResponse = await sendCancellation({
      createdAt: '2026-01-01T12:00:00.000Z',
      startTime: '2026-01-02T12:00:00.000Z',
    })
    expect(cancellationResponse.status).toBe(200)

    mocks.createLocalBooking.mockResolvedValueOnce({
      booking: { id: 7, paymentId: 99, status: 'CANCELLED' },
      lifecycle: { state: 'CANCELLED' },
      created: true,
    })
    const createResponse = await processCalcomWebhookEvent({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T11:00:00.000Z',
      payload: {
        ...cancellationPayload({
          startTime: '2026-01-02T12:00:00.000Z',
          cancelledByEmail: null,
        }),
        status: 'ACCEPTED',
      },
    })

    expect(createResponse.status).toBe(201)
    expect(mocks.updatePaymentPayoutEligibility).not.toHaveBeenCalled()
    expect(mocks.scheduleMentorPayout).not.toHaveBeenCalled()
  })

  it('ignores an organizer-less MEETING_ENDED for an unknown routed booking', async () => {
    const response = await processCalcomWebhookEvent(
      {
        triggerEvent: 'MEETING_ENDED',
        createdAt: '2026-01-02T13:00:00.000Z',
        payload: { uid: 'meeting-ended-first', bookingId: 789 },
      },
      {
        expectedMentorUserId: mentorUserId,
        expectedCalcomUserId: 42,
      }
    )

    expect(response.status).toBe(200)
    expect(mocks.getLocalBookingLifecycleContext).toHaveBeenCalledWith('meeting-ended-first')
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('ignores an organizer-less global no-show for an unknown routed booking', async () => {
    const event = {
      triggerEvent: 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW',
      createdAt: '2026-01-02T13:00:00.000Z',
      payload: {
        title: 'External booking',
        bookingId: 999,
        bookingUid: 'non-discuno-global-booking',
        startTime: '2026-01-02T12:00:00.000Z',
        endTime: '2026-01-02T13:00:00.000Z',
        attendees: [{ email: 'external@example.com', name: 'External Guest' }],
        participants: [],
        eventType: { id: 123, teamId: null, parentId: null },
        webhook: {
          id: 'global-hook',
          subscriberUrl: 'https://discuno.test/api/webhooks/cal',
          appId: null,
          time: 5,
          timeUnit: 'MINUTE',
          eventTriggers: ['AFTER_GUESTS_CAL_VIDEO_NO_SHOW'],
          payloadTemplate: null,
        },
        message: 'Guest did not join',
      },
    }
    const response = await processCalcomWebhookEvent(event, {
      expectedMentorUserId: mentorUserId,
      expectedCalcomUserId: 42,
    })

    expect(response.status).toBe(200)
    expect(mocks.getLocalBookingLifecycleContext).toHaveBeenCalledWith('non-discuno-global-booking')
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('acknowledges an unknown no-show without verified context but writes nothing', async () => {
    const response = await processCalcomWebhookEvent({
      triggerEvent: 'BOOKING_NO_SHOW_UPDATED',
      createdAt: '2026-01-02T13:00:00.000Z',
      payload: {
        message: 'No-show updated',
        attendees: [{ email: 'external@example.com', noShow: true }],
        bookingUid: 'unverified-global-booking',
        bookingId: 1000,
      },
    })

    expect(response.status).toBe(200)
    expect(mocks.getLocalBookingLifecycleContext).toHaveBeenCalledWith('unverified-global-booking')
    expect(mocks.recordLocalBookingLifecycle).not.toHaveBeenCalled()
  })

  it('preserves a pending Cal.com booking status instead of accepting it locally', async () => {
    const event = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T12:00:00.000Z',
      payload: {
        ...cancellationPayload({
          startTime: '2026-01-02T12:00:00.000Z',
          cancelledByEmail: null,
        }),
        status: 'PENDING',
      },
    }
    const response = await processCalcomWebhookEvent(event)

    expect(response.status).toBe(201)
    expect(mocks.createLocalBooking).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' })
    )
  })

  it('resolves BOOKING_CREATED actor metadata and stores the canonical attendee user', async () => {
    mocks.resolveCanonicalUserId.mockResolvedValueOnce(linkedActorUserId)
    const response = await processCalcomWebhookEvent({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T12:00:00.000Z',
      payload: {
        ...cancellationPayload({
          startTime: '2026-01-02T12:00:00.000Z',
          cancelledByEmail: null,
        }),
        additionalNotes: 'Private student goal',
        responses: { email: 'mentee@example.com', notes: 'Private student goal' },
        status: 'ACCEPTED',
      },
    })

    expect(response.status).toBe(201)
    expect(mocks.resolveCanonicalUserId).toHaveBeenCalledWith(actorUserId)
    expect(mocks.createLocalBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        attendee: expect.objectContaining({
          userId: linkedActorUserId,
          email: 'mentee@example.com',
        }),
        webhookPayload: {
          version: 1,
          source: 'calcom_webhook',
          triggerEvent: 'BOOKING_CREATED',
          eventCreatedAt: '2026-01-01T12:00:00.000Z',
        },
      })
    )
    expect(JSON.stringify(mocks.createLocalBooking.mock.calls)).not.toContain(
      'Private student goal'
    )
  })

  it('binds a paid BOOKING_CREATED notification to the authenticated Cal.com booking', async () => {
    const startTime = '2026-01-02T12:00:00.000Z'
    mocks.paymentLimit.mockResolvedValue([
      {
        mentorUserId,
        customerEmail: 'mentee@example.com',
        calcomBookingUid: null,
        platformStatus: 'SUCCEEDED',
        metadata: {
          checkoutSessionMetadata: {
            mentorUserId,
            actorUserId,
            attendeeEmail: 'mentee@example.com',
            eventTypeId: '123',
            startTime,
            eventDurationMinutes: '60',
          },
        },
      },
    ])
    mocks.getCalcomBooking.mockResolvedValue({
      id: 456,
      uid: 'booking-cancelled',
      status: 'accepted',
      start: startTime,
      end: '2026-01-02T13:00:00.000Z',
      duration: 60,
      eventTypeId: 123,
      updatedAt: '2026-01-01T12:00:00.000Z',
      absentHost: false,
      hosts: [{ email: 'mentor@example.com' }],
      attendees: [{ email: 'mentee@example.com', absent: false }],
      metadata: { paymentId: '99', mentorUserId, actorUserId },
    })
    mocks.createLocalBooking.mockResolvedValueOnce({
      booking: { id: 7, paymentId: 99, status: 'ACCEPTED' },
      lifecycle: { state: 'ACTIVE' },
      created: true,
    })

    const response = await processCalcomWebhookEvent({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T12:00:00.000Z',
      payload: {
        ...cancellationPayload({ startTime, cancelledByEmail: null }),
        metadata: { mentorUserId, actorUserId, paymentId: '99' },
        status: 'ACCEPTED',
      },
    })

    expect(response.status).toBe(201)
    expect(mocks.getCalcomBooking).toHaveBeenCalledWith('booking-cancelled', mentorUserId)
    expect(mocks.createLocalBooking).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 99, status: 'ACCEPTED' })
    )
  })

  it('rejects paid BOOKING_CREATED when the provider attendee is not the customer', async () => {
    const startTime = '2026-01-02T12:00:00.000Z'
    mocks.paymentLimit.mockResolvedValue([
      {
        mentorUserId,
        customerEmail: 'mentee@example.com',
        calcomBookingUid: null,
        platformStatus: 'SUCCEEDED',
        metadata: {
          checkoutSessionMetadata: {
            mentorUserId,
            actorUserId,
            attendeeEmail: 'mentee@example.com',
            eventTypeId: '123',
            startTime,
            eventDurationMinutes: '60',
          },
        },
      },
    ])
    mocks.getCalcomBooking.mockResolvedValue({
      id: 456,
      uid: 'booking-cancelled',
      status: 'accepted',
      start: startTime,
      end: '2026-01-02T13:00:00.000Z',
      duration: 60,
      eventTypeId: 123,
      updatedAt: '2026-01-01T12:00:00.000Z',
      absentHost: false,
      hosts: [{ email: 'mentor@example.com' }],
      attendees: [{ email: 'accomplice@example.com', absent: false }],
      metadata: { paymentId: '99', mentorUserId, actorUserId },
    })

    const response = await processCalcomWebhookEvent({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-01-01T12:00:00.000Z',
      payload: {
        ...cancellationPayload({ startTime, cancelledByEmail: null }),
        metadata: { mentorUserId, actorUserId, paymentId: '99' },
        status: 'ACCEPTED',
      },
    })

    expect(response.status).toBe(400)
    expect(mocks.createLocalBooking).not.toHaveBeenCalled()
  })
})
