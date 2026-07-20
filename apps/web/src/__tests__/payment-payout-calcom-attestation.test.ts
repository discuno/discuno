import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const paymentFrom = vi.fn()
  const paymentInnerJoin = vi.fn()
  const paymentLeftJoin = vi.fn()
  const paymentWhere = vi.fn()
  const paymentLimit = vi.fn()
  const paymentSelectBuilder = {
    from: paymentFrom,
    innerJoin: paymentInnerJoin,
    leftJoin: paymentLeftJoin,
    where: paymentWhere,
    limit: paymentLimit,
  }
  paymentFrom.mockReturnValue(paymentSelectBuilder)
  paymentInnerJoin.mockReturnValue(paymentSelectBuilder)
  paymentLeftJoin.mockReturnValue(paymentSelectBuilder)
  paymentWhere.mockReturnValue(paymentSelectBuilder)

  const disputeWhere = vi.fn()
  const disputeFrom = vi.fn(() => ({ where: disputeWhere }))
  const predecessorLimit = vi.fn()
  const predecessorBuilder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: predecessorLimit,
  }
  predecessorBuilder.from.mockReturnValue(predecessorBuilder)
  predecessorBuilder.where.mockReturnValue(predecessorBuilder)
  const select = vi.fn()

  const updateReturning = vi.fn()
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  const updateSet = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set: updateSet }))

  const onConflictDoUpdate = vi.fn()
  const insertValues = vi.fn(() => ({ onConflictDoUpdate }))
  const insert = vi.fn(() => ({ values: insertValues }))

  return {
    chargeList: vi.fn(),
    chargeRetrieve: vi.fn(),
    disputeFrom,
    disputeList: vi.fn(),
    disputeRetrieve: vi.fn(),
    disputeWhere,
    getCalcomBooking: vi.fn(),
    insert,
    insertValues,
    onConflictDoUpdate,
    paymentFindFirst: vi.fn(),
    paymentIntentRetrieve: vi.fn(),
    refundList: vi.fn(),
    paymentLimit,
    paymentSelectBuilder,
    predecessorBuilder,
    predecessorLimit,
    reviewRetrieve: vi.fn(),
    select,
    sendAdminAlert: vi.fn(),
    sendPayoutNotificationEmail: vi.fn(),
    transferCreate: vi.fn(),
    transferCreateReversal: vi.fn(),
    transferList: vi.fn(),
    transferRetrieve: vi.fn(),
    update,
    updateReturning,
    updateSet,
    updateWhere,
    withDatabaseAdvisoryLock: vi.fn(),
  }
})

vi.mock('~/inngest/client', () => ({ inngest: { send: vi.fn() } }))
vi.mock('~/lib/calcom', () => ({
  cancelCalcomBooking: vi.fn(),
  getCalcomBooking: mocks.getCalcomBooking,
}))
vi.mock('~/lib/emails/booking-notifications', () => ({
  sendAdminAlert: mocks.sendAdminAlert,
  sendPayoutNotificationEmail: mocks.sendPayoutNotificationEmail,
  sendRefundNotificationEmail: vi.fn(),
}))
vi.mock('~/lib/stripe', () => ({
  stripe: {
    charges: { list: mocks.chargeList, retrieve: mocks.chargeRetrieve },
    disputes: { list: mocks.disputeList, retrieve: mocks.disputeRetrieve },
    paymentIntents: { retrieve: mocks.paymentIntentRetrieve },
    reviews: { retrieve: mocks.reviewRetrieve },
    refunds: { list: mocks.refundList },
    transfers: {
      create: mocks.transferCreate,
      createReversal: mocks.transferCreateReversal,
      list: mocks.transferList,
      retrieve: mocks.transferRetrieve,
    },
  },
}))
vi.mock('~/lib/stripe/refund', () => ({ refundStripePaymentIntent: vi.fn() }))
vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: mocks.withDatabaseAdvisoryLock,
}))
vi.mock('~/server/db', () => ({
  db: {
    insert: mocks.insert,
    query: { payment: { findFirst: mocks.paymentFindFirst } },
    select: mocks.select,
    update: mocks.update,
  },
}))

import { transferMentorPayment } from '~/lib/services/payment-service'

const PAYMENT_ID = 77
const MENTOR_USER_ID = '11111111-1111-4111-8111-111111111111'
const CALCOM_BOOKING_UID = 'cal-booking-payout-77'
const BOOKING_START = new Date('2020-01-02T12:00:00.000Z')
const BOOKING_END = new Date('2020-01-02T13:00:00.000Z')

const paymentRecord = () => ({
  paymentId: PAYMENT_ID,
  mentorUserId: MENTOR_USER_ID,
  customerEmail: 'student@example.edu',
  currentCalcomBookingUid: CALCOM_BOOKING_UID,
  paymentIntentId: 'pi_77',
  platformStatus: 'SUCCEEDED' as const,
  currency: 'USD',
  mentorAmount: 8500,
  mentorStripeAccountId: 'acct_mentor_77',
  transferGroup: 'discuno-payment-77',
  transferId: null,
  transferStatus: null,
  transferGeneration: 0,
  transferReversalId: null,
  disputeRequested: false,
  disputePeriodEnds: new Date('2020-01-03T13:00:00.000Z'),
  bookingStatus: 'ACCEPTED' as const,
  calcomBookingId: 707,
  bookingStartTime: BOOKING_START,
  bookingEndTime: BOOKING_END,
  hostNoShow: false,
  attendeeNoShow: false,
  mentorPayoutEligible: false,
  cancellationObservedAt: new Date('2020-01-02T11:00:00.000Z'),
  mentorEmail: null,
  requiresManualReview: false,
  reviewReason: null,
  checkoutSnapshot: {
    checkoutSessionMetadata: {
      mentorUserId: MENTOR_USER_ID,
      actorUserId: '22222222-2222-4222-8222-222222222222',
      attendeeEmail: 'student@example.edu',
      eventTypeId: '42',
      startTime: BOOKING_START.toISOString(),
      eventDurationMinutes: '60',
    },
  },
})

const providerBooking = () => {
  return {
    id: 707,
    uid: CALCOM_BOOKING_UID,
    status: 'accepted',
    start: BOOKING_START.toISOString(),
    end: BOOKING_END.toISOString(),
    duration: 60,
    eventTypeId: 42,
    rescheduledFromUid: null as string | null,
    updatedAt: '2020-01-02T11:00:00.000Z',
    absentHost: false,
    cancelledByEmail: null as string | null,
    hosts: [{ email: 'mentor@example.edu' }],
    attendees: [{ email: 'student@example.edu', absent: false }],
    metadata: {
      paymentId: PAYMENT_ID.toString(),
      mentorUserId: MENTOR_USER_ID,
      actorUserId: '22222222-2222-4222-8222-222222222222',
    },
  }
}

type PaymentRecord = Omit<
  ReturnType<typeof paymentRecord>,
  'bookingStatus' | 'checkoutSnapshot'
> & {
  bookingStatus: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | 'COMPLETED' | 'NO_SHOW'
  checkoutSnapshot: unknown
}
type ProviderBooking = ReturnType<typeof providerBooking>
type ProviderBookingOverride = Partial<Omit<ProviderBooking, 'metadata'>> & {
  metadata?: Partial<ProviderBooking['metadata']>
}

const configurePayout = ({
  record: recordOverride = {},
  provider: providerOverride = {},
}: {
  record?: Partial<PaymentRecord>
  provider?: ProviderBookingOverride
} = {}) => {
  const localRecord = { ...paymentRecord(), ...recordOverride }
  const remoteBooking = {
    ...providerBooking(),
    ...providerOverride,
    metadata: {
      ...providerBooking().metadata,
      ...providerOverride.metadata,
    },
  }
  mocks.paymentLimit.mockResolvedValue([localRecord])
  mocks.getCalcomBooking.mockResolvedValue(remoteBooking)
}

describe('mentor payout Cal.com financial attestation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let selectCount = 0
    mocks.select.mockImplementation(() => {
      selectCount += 1
      return selectCount === 1 ? mocks.paymentSelectBuilder : { from: mocks.disputeFrom }
    })
    mocks.disputeWhere.mockResolvedValue([])
    mocks.updateReturning.mockResolvedValue([{ id: PAYMENT_ID }])
    mocks.onConflictDoUpdate.mockResolvedValue(undefined)
    mocks.withDatabaseAdvisoryLock.mockImplementation(
      async (_key: string, operation: () => Promise<unknown>) => operation()
    )
    mocks.sendAdminAlert.mockResolvedValue(undefined)
    mocks.sendPayoutNotificationEmail.mockResolvedValue(true)
    mocks.paymentIntentRetrieve.mockResolvedValue({
      id: 'pi_77',
      status: 'succeeded',
      latest_charge: 'ch_77',
    })
    mocks.chargeRetrieve.mockResolvedValue({
      id: 'ch_77',
      paid: true,
      status: 'succeeded',
      disputed: false,
      review: null,
      refunded: false,
      amount_refunded: 0,
    })
    mocks.disputeList.mockResolvedValue({ data: [], has_more: false })
    mocks.refundList.mockResolvedValue({ data: [], has_more: false })
    mocks.transferList.mockResolvedValue({ data: [], has_more: false })
    mocks.transferCreate.mockResolvedValue({
      id: 'tr_77',
      amount: 8500,
      amount_reversed: 0,
      currency: 'usd',
      destination: 'acct_mentor_77',
      source_transaction: 'ch_77',
      reversed: false,
      metadata: {
        discunoPaymentId: PAYMENT_ID.toString(),
        discunoTransferGeneration: '0',
      },
    })
    configurePayout()
  })

  it.each([
    {
      label: 'payment metadata',
      provider: { metadata: { paymentId: '999' } },
    },
    {
      label: 'mentor metadata',
      provider: {
        metadata: { mentorUserId: '22222222-2222-4222-8222-222222222222' },
      },
    },
    {
      label: 'actor metadata',
      provider: {
        metadata: { actorUserId: '33333333-3333-4333-8333-333333333333' },
      },
    },
    {
      label: 'paying attendee',
      provider: { attendees: [{ email: 'accomplice@example.edu', absent: false }] },
    },
    {
      label: 'provider booking ID',
      provider: { id: 708 },
    },
    {
      label: 'canonical payment booking UID',
      record: { currentCalcomBookingUid: 'different-current-booking' },
    },
    {
      label: 'checkout snapshot metadata',
      record: { checkoutSnapshot: {} },
    },
    {
      label: 'event type snapshot',
      provider: { eventTypeId: 43 },
    },
    {
      label: 'start time',
      provider: { start: '2020-01-02T12:05:00.000Z' },
    },
    {
      label: 'end time',
      provider: { end: '2020-01-02T13:05:00.000Z' },
    },
    {
      label: 'duration',
      provider: { duration: 30 },
    },
    {
      label: 'provider status',
      provider: { status: 'pending' },
    },
    {
      label: 'host attendance',
      provider: { absentHost: true },
    },
    {
      label: 'attendee no-show evidence',
      record: { bookingStatus: 'NO_SHOW', attendeeNoShow: true },
    },
    {
      label: 'paying attendee no-show evidence',
      record: { bookingStatus: 'NO_SHOW', attendeeNoShow: true },
      provider: {
        attendees: [
          { email: 'student@example.edu', absent: false },
          { email: 'accomplice@example.edu', absent: true },
        ],
      },
    },
    {
      label: 'late-cancellation actor evidence',
      record: { bookingStatus: 'CANCELLED', mentorPayoutEligible: true },
      provider: {
        status: 'cancelled',
        cancelledByEmail: 'mentor@example.edu',
      },
    },
    {
      label: 'inclusive 24-hour cancellation boundary',
      record: {
        bookingStatus: 'CANCELLED',
        mentorPayoutEligible: true,
        cancellationObservedAt: new Date('2020-01-01T12:00:00.000Z'),
      },
      provider: {
        status: 'cancelled',
        cancelledByEmail: 'student@example.edu',
        updatedAt: '2020-01-01T12:00:00.000Z',
      },
    },
  ] satisfies Array<{
    label: string
    record?: Partial<PaymentRecord>
    provider?: ProviderBookingOverride
  }>)('holds payout when Cal.com cannot attest $label', async ({ record, provider }) => {
    configurePayout({ record, provider })

    await expect(
      transferMentorPayment({
        paymentId: PAYMENT_ID,
        calcomBookingUid: CALCOM_BOOKING_UID,
      })
    ).resolves.toEqual({ success: true, skipped: true, reason: 'manual_review' })

    expect(mocks.getCalcomBooking).toHaveBeenCalledWith(CALCOM_BOOKING_UID, MENTOR_USER_ID)
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        requiresManualReview: true,
        reviewReason: 'Cal.com could not confirm the booking state required for mentor payout',
      })
    )
    expect(mocks.sendAdminAlert).toHaveBeenCalledWith({
      type: 'CALCOM_PAYOUT_RECONCILIATION_FAILED',
      paymentId: PAYMENT_ID,
      error: 'Cal.com could not confirm the booking state required for mentor payout',
    })
    expect(mocks.paymentIntentRetrieve).not.toHaveBeenCalled()
    expect(mocks.transferList).not.toHaveBeenCalled()
    expect(mocks.transferCreate).not.toHaveBeenCalled()
  })

  it('allows an exact accepted delivered booking to reach Stripe reconciliation', async () => {
    await expect(
      transferMentorPayment({
        paymentId: PAYMENT_ID,
        calcomBookingUid: CALCOM_BOOKING_UID,
      })
    ).resolves.toEqual({ success: true, transferId: 'tr_77' })

    expect(mocks.getCalcomBooking).toHaveBeenCalledWith(CALCOM_BOOKING_UID, MENTOR_USER_ID)
    expect(mocks.paymentIntentRetrieve).toHaveBeenCalledWith('pi_77')
    expect(mocks.transferList).toHaveBeenCalledWith({
      transfer_group: 'discuno-payment-77',
      limit: 100,
    })
    expect(mocks.transferCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8500,
        destination: 'acct_mentor_77',
        source_transaction: 'ch_77',
      }),
      { idempotencyKey: 'discuno:mentor-transfer:v2:77:0' }
    )
    expect(mocks.sendAdminAlert).not.toHaveBeenCalled()
  })

  it('allows a provider-linked reschedule with a cancelled local predecessor', async () => {
    const rescheduledStart = new Date('2020-01-03T15:00:00.000Z')
    const rescheduledEnd = new Date('2020-01-03T16:00:00.000Z')
    configurePayout({
      record: {
        bookingStartTime: rescheduledStart,
        bookingEndTime: rescheduledEnd,
      },
      provider: {
        start: rescheduledStart.toISOString(),
        end: rescheduledEnd.toISOString(),
        rescheduledFromUid: 'cal-booking-previous',
      },
    })
    mocks.predecessorLimit.mockResolvedValue([{ id: 1 }])
    let selectCount = 0
    mocks.select.mockImplementation(() => {
      selectCount += 1
      if (selectCount === 1) return mocks.paymentSelectBuilder
      if (selectCount === 2) return mocks.predecessorBuilder
      return { from: mocks.disputeFrom }
    })

    await expect(
      transferMentorPayment({
        paymentId: PAYMENT_ID,
        calcomBookingUid: CALCOM_BOOKING_UID,
      })
    ).resolves.toEqual({ success: true, transferId: 'tr_77' })

    expect(mocks.transferCreate).toHaveBeenCalledOnce()
    expect(mocks.sendAdminAlert).not.toHaveBeenCalled()
  })

  it('fails closed when Stripe returns more refunds than can be reconciled safely', async () => {
    mocks.refundList.mockResolvedValue({ data: [], has_more: true })

    await expect(
      transferMentorPayment({
        paymentId: PAYMENT_ID,
        calcomBookingUid: CALCOM_BOOKING_UID,
      })
    ).resolves.toEqual({ success: true, skipped: true, reason: 'manual_review' })

    expect(mocks.transferCreate).not.toHaveBeenCalled()
    expect(mocks.sendAdminAlert).toHaveBeenCalledWith({
      type: 'REFUND_RECONCILIATION_LIMIT_EXCEEDED',
      paymentId: PAYMENT_ID,
      error: 'Stripe refund reconciliation exceeded the 100-object safety limit',
    })
  })
})
