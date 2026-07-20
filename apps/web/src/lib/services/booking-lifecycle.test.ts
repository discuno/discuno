import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cancelCalcomBooking: vi.fn(),
  cancelBooking: vi.fn(),
  claimBookingLifecycleSideEffects: vi.fn(),
  completeAcceptedBooking: vi.fn(),
  createBooking: vi.fn(),
  getBookingLifecycle: vi.fn(),
  getBookingLifecycleContextByCalcomUid: vi.fn(),
  holdBookingPaymentForManualReview: vi.fn(),
  markBookingLifecycleSideEffectsCompleted: vi.fn(),
  recordBookingLifecycleEvent: vi.fn(),
  refundBookingPayment: vi.fn(),
  releaseBookingLifecycleSideEffectsClaim: vi.fn(),
  requireOwnedMentorBooking: vi.fn(),
  scheduleBookingMentorPayout: vi.fn(),
  setBookingMentorPayoutEligibility: vi.fn(),
  updateBookingStatus: vi.fn(),
}))

vi.mock('~/lib/calcom', () => ({ cancelCalcomBooking: mocks.cancelCalcomBooking }))
vi.mock('~/lib/services/payment-service', () => ({
  holdBookingPaymentForManualReview: mocks.holdBookingPaymentForManualReview,
  refundBookingPayment: mocks.refundBookingPayment,
  scheduleBookingMentorPayout: mocks.scheduleBookingMentorPayout,
}))
vi.mock('~/server/dal/bookings', () => ({
  cancelBooking: mocks.cancelBooking,
  claimBookingLifecycleSideEffects: mocks.claimBookingLifecycleSideEffects,
  completeAcceptedBooking: mocks.completeAcceptedBooking,
  createBooking: mocks.createBooking,
  getBookingLifecycle: mocks.getBookingLifecycle,
  getBookingLifecycleContextByCalcomUid: mocks.getBookingLifecycleContextByCalcomUid,
  markBookingLifecycleSideEffectsCompleted: mocks.markBookingLifecycleSideEffectsCompleted,
  recordBookingLifecycleEvent: mocks.recordBookingLifecycleEvent,
  releaseBookingLifecycleSideEffectsClaim: mocks.releaseBookingLifecycleSideEffectsClaim,
  setBookingMentorPayoutEligibility: mocks.setBookingMentorPayoutEligibility,
  updateBookingStatus: mocks.updateBookingStatus,
}))
vi.mock('~/server/queries/bookings', () => ({
  requireOwnedMentorBooking: mocks.requireOwnedMentorBooking,
}))

import {
  createLocalBooking,
  reconcileBookingLifecycleFinancials,
} from '~/lib/services/booking-service'

const eventCreatedAt = new Date('2026-07-15T12:00:00.000Z')
const claimedAt = new Date('2026-07-15T12:01:00.000Z')
const lifecycle = {
  calcomUid: 'cancelled-before-create',
  calcomBookingId: 42,
  mentorUserId: '11111111-1111-4111-8111-111111111111',
  calcomUserId: 84,
  state: 'CANCELLED' as const,
  financialDisposition: 'REFUND_EARLY_CANCELLATION' as const,
  mentorPayoutEligible: false,
  eventCreatedAt,
  sideEffectsClaimedAt: null,
  sideEffectsCompletedAt: null,
  createdAt: eventCreatedAt,
  updatedAt: eventCreatedAt,
}

describe('Cal.com booking lifecycle reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.claimBookingLifecycleSideEffects.mockResolvedValue(claimedAt)
    mocks.markBookingLifecycleSideEffectsCompleted.mockResolvedValue(true)
    mocks.releaseBookingLifecycleSideEffectsClaim.mockResolvedValue(undefined)
    mocks.refundBookingPayment.mockResolvedValue({ success: true })
  })

  it('claims the exact lifecycle decision before issuing a refund', async () => {
    await reconcileBookingLifecycleFinancials(lifecycle)

    expect(mocks.claimBookingLifecycleSideEffects).toHaveBeenCalledWith(lifecycle)
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith(
      'cancelled-before-create',
      'early_cancellation'
    )
    expect(mocks.markBookingLifecycleSideEffectsCompleted).toHaveBeenCalledWith(
      lifecycle,
      claimedAt
    )
    expect(mocks.claimBookingLifecycleSideEffects.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.refundBookingPayment.mock.invocationCallOrder[0] ?? 0
    )
    expect(mocks.refundBookingPayment.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.markBookingLifecycleSideEffectsCompleted.mock.invocationCallOrder[0] ?? 0
    )
  })

  it('releases the lease when the financial operation fails so the inbox can retry', async () => {
    mocks.refundBookingPayment.mockResolvedValueOnce({
      success: false,
      error: 'Stripe unavailable',
    })

    await expect(reconcileBookingLifecycleFinancials(lifecycle)).rejects.toThrow(
      'Stripe unavailable'
    )
    expect(mocks.releaseBookingLifecycleSideEffectsClaim).toHaveBeenCalledWith(lifecycle, claimedAt)
    expect(mocks.markBookingLifecycleSideEffectsCompleted).not.toHaveBeenCalled()
  })

  it('reconciles a terminal marker when the booking snapshot is created later', async () => {
    mocks.createBooking.mockResolvedValueOnce({
      booking: { id: 7, status: 'CANCELLED', paymentId: 99 },
      lifecycle,
      created: true,
    })

    const result = await createLocalBooking({} as Parameters<typeof createLocalBooking>[0])

    expect(result.booking.status).toBe('CANCELLED')
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith(
      'cancelled-before-create',
      'early_cancellation'
    )
  })

  it('does not acknowledge a live financial lease as completed', async () => {
    mocks.claimBookingLifecycleSideEffects.mockResolvedValueOnce(null)
    mocks.getBookingLifecycle.mockResolvedValueOnce({
      ...lifecycle,
      sideEffectsClaimedAt: claimedAt,
    })

    await expect(reconcileBookingLifecycleFinancials(lifecycle)).rejects.toThrow(
      'already in progress'
    )
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
  })
})
