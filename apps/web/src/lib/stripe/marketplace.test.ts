import { describe, expect, it } from 'vitest'
import {
  calculateMarketplaceAmounts,
  getExpandableId,
  getMentorPayoutEligibleAt,
  getPlatformStatusForRefund,
  getReconciledDisputeState,
  isMentorPayoutEligibleBooking,
  normalizeStripeRefundStatus,
  shouldAutomaticallyRefundCancellation,
  shouldReverseMentorTransferForRefundStatus,
} from './marketplace'

describe('Discuno marketplace payment policy', () => {
  it('charges no buyer fee and assigns 85% of the listed price to the mentor', () => {
    expect(calculateMarketplaceAmounts(5_000)).toEqual({
      listedPrice: 5_000,
      menteeFee: 0,
      mentorFee: 750,
      mentorAmount: 4_250,
    })
  })

  it('keeps rounded fee and mentor amounts equal to the listed price', () => {
    const amounts = calculateMarketplaceAmounts(501)
    expect(amounts.mentorFee + amounts.mentorAmount).toBe(501)
  })

  it.each([
    [0, 0, 0],
    [1, 0, 1],
    [3, 0, 3],
    [4, 1, 3],
    [499, 75, 424],
    [500, 75, 425],
    [999, 150, 849],
  ])(
    'rounds the 15%% commission once for a %i-cent listing',
    (listedPrice, mentorFee, mentorAmount) => {
      expect(calculateMarketplaceAmounts(listedPrice)).toEqual({
        listedPrice,
        menteeFee: 0,
        mentorFee,
        mentorAmount,
      })
    }
  )

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid listed prices (%s)',
    listedPrice => {
      expect(() => calculateMarketplaceAmounts(listedPrice)).toThrow(
        'Listed price must be a non-negative integer'
      )
    }
  )

  it('opens payout eligibility 72 hours after the scheduled session ends', () => {
    expect(getMentorPayoutEligibleAt('2026-08-01T12:00:00.000Z', 60).toISOString()).toBe(
      '2026-08-04T13:00:00.000Z'
    )
  })

  it('calculates payout eligibility from absolute time across daylight-saving changes', () => {
    expect(getMentorPayoutEligibleAt('2026-11-01T01:30:00-04:00', 60).toISOString()).toBe(
      '2026-11-04T06:30:00.000Z'
    )
  })

  it.each([
    ['not-a-date', 60, 'Invalid booking start time'],
    ['2026-08-01T12:00:00.000Z', 0, 'Duration must be a positive integer'],
    ['2026-08-01T12:00:00.000Z', -1, 'Duration must be a positive integer'],
    ['2026-08-01T12:00:00.000Z', 30.5, 'Duration must be a positive integer'],
  ] as const)('rejects an invalid payout input', (startTime, duration, message) => {
    expect(() => getMentorPayoutEligibleAt(startTime, duration)).toThrow(message)
  })

  it('automatically refunds mentor cancellations and early mentee cancellations', () => {
    const now = new Date('2026-08-01T12:00:00.000Z')
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'MENTOR@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-01T13:00:00.000Z',
        now,
      })
    ).toBe(true)
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'mentee@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-02T12:00:00.000Z',
        now,
      })
    ).toBe(true)
  })

  it('does not automatically refund a late mentee cancellation', () => {
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'mentee@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-01T13:00:00.000Z',
        now: new Date('2026-08-01T12:00:00.000Z'),
      })
    ).toBe(false)
  })

  it('uses an inclusive 24-hour full-refund boundary', () => {
    const now = new Date('2026-08-01T12:00:00.000Z')

    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'mentee@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-02T12:00:00.000Z',
        now,
      })
    ).toBe(true)
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'mentee@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-02T11:59:59.999Z',
        now,
      })
    ).toBe(false)
  })

  it('refunds a mentor cancellation regardless of lead time and normalizes whitespace', () => {
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: '  MENTOR@example.com  ',
        organizerEmail: 'mentor@example.com',
        startTime: '2026-08-01T12:01:00.000Z',
        now: new Date('2026-08-01T12:00:00.000Z'),
      })
    ).toBe(true)
  })

  it('fails closed on an invalid cancellation time', () => {
    expect(
      shouldAutomaticallyRefundCancellation({
        cancelledByEmail: 'mentee@example.com',
        organizerEmail: 'mentor@example.com',
        startTime: 'invalid',
        now: new Date('2026-08-01T12:00:00.000Z'),
      })
    ).toBe(false)
  })

  it('pays a mentor for a reviewed late mentee cancellation', () => {
    expect(
      isMentorPayoutEligibleBooking({
        status: 'CANCELLED',
        endTime: '2026-08-01T13:00:00.000Z',
        mentorPayoutEligible: true,
      })
    ).toBe(true)
  })

  it('does not pay a mentor for refunded or unreviewed cancellations', () => {
    expect(
      isMentorPayoutEligibleBooking({
        status: 'CANCELLED',
        endTime: '2026-08-01T13:00:00.000Z',
        mentorPayoutEligible: false,
      })
    ).toBe(false)
  })

  it('keeps completion, elapsed accepted sessions, and attendee no-shows payout eligible', () => {
    const now = new Date('2026-08-01T14:00:00.000Z')
    expect(
      isMentorPayoutEligibleBooking({
        status: 'COMPLETED',
        endTime: '2026-08-01T15:00:00.000Z',
        now,
      })
    ).toBe(true)
    expect(
      isMentorPayoutEligibleBooking({
        status: 'ACCEPTED',
        endTime: '2026-08-01T13:00:00.000Z',
        now,
      })
    ).toBe(true)
    expect(
      isMentorPayoutEligibleBooking({
        status: 'NO_SHOW',
        endTime: '2026-08-01T13:00:00.000Z',
        attendeeNoShow: true,
        hostNoShow: false,
        now,
      })
    ).toBe(true)
  })

  it('extracts Stripe IDs from expanded and unexpanded resources', () => {
    expect(getExpandableId('tr_123')).toBe('tr_123')
    expect(getExpandableId({ id: 'tr_456' })).toBe('tr_456')
    expect(getExpandableId(null)).toBeNull()
    expect(getExpandableId(undefined)).toBeNull()
  })

  it.each([
    ['needs_response', 'active'],
    ['under_review', 'active'],
    ['warning_needs_response', 'active'],
    ['warning_under_review', 'active'],
    ['lost', 'lost'],
    ['won', 'released'],
    ['warning_closed', 'released'],
    ['prevented', 'released'],
  ] as const)('maps dispute status %s to %s', (status, expected) => {
    expect(getReconciledDisputeState(status)).toBe(expected)
  })

  it('normalizes unknown refund states defensively and maps accepted refunds', () => {
    expect(normalizeStripeRefundStatus(null)).toBe('failed')
    expect(normalizeStripeRefundStatus('future_status')).toBe('failed')
    expect(getPlatformStatusForRefund('pending')).toBe('PROCESSING')
    expect(getPlatformStatusForRefund('requires_action')).toBe('PROCESSING')
    expect(getPlatformStatusForRefund('succeeded')).toBe('REFUNDED')
    expect(getPlatformStatusForRefund('failed')).toBe('FAILED')
    expect(getPlatformStatusForRefund('canceled')).toBe('FAILED')
  })

  it('reverses mentor funds for every live refund state, including requires-action', () => {
    expect(shouldReverseMentorTransferForRefundStatus('succeeded')).toBe(true)
    expect(shouldReverseMentorTransferForRefundStatus('pending')).toBe(true)
    expect(shouldReverseMentorTransferForRefundStatus('requires_action')).toBe(true)
    expect(shouldReverseMentorTransferForRefundStatus('failed')).toBe(false)
    expect(shouldReverseMentorTransferForRefundStatus('canceled')).toBe(false)
  })
})
