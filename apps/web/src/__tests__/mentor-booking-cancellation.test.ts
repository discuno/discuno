import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cancelCalcomBooking: vi.fn(),
  getBookingByCalcomUidAndMentorId: vi.fn(),
  requirePermission: vi.fn(),
  refundBookingPayment: vi.fn(),
}))

vi.mock('~/lib/calcom', () => ({
  cancelCalcomBooking: mocks.cancelCalcomBooking,
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requirePermission: mocks.requirePermission,
}))

vi.mock('~/lib/services/payment-service', () => ({
  refundBookingPayment: mocks.refundBookingPayment,
}))

vi.mock('~/server/dal/bookings', () => ({
  cancelBooking: vi.fn(),
  completeAcceptedBooking: vi.fn(),
  createBooking: vi.fn(),
  getBookingByCalcomUidAndMentorId: mocks.getBookingByCalcomUidAndMentorId,
  getBookingsByMentorId: vi.fn(),
  setBookingMentorPayoutEligibility: vi.fn(),
  updateBookingStatus: vi.fn(),
}))

import { cancelOwnedMentorBooking } from '~/lib/services/booking-service'

describe('mentor booking cancellation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      session: { userId: 'mentor-1' },
      user: { id: 'mentor-1' },
    })
    mocks.cancelCalcomBooking.mockResolvedValue({ status: 'cancelled' })
    mocks.refundBookingPayment.mockResolvedValue({ success: true })
  })

  it('cancels a booking owned by the authenticated mentor', async () => {
    mocks.getBookingByCalcomUidAndMentorId.mockResolvedValue({
      id: 42,
      calcomUid: 'booking-owned',
    })

    await cancelOwnedMentorBooking('booking-owned', 'Cancelled by mentor')

    expect(mocks.requirePermission).toHaveBeenCalledWith({ mentor: ['manage'] })
    expect(mocks.getBookingByCalcomUidAndMentorId).toHaveBeenCalledWith('booking-owned', 'mentor-1')
    expect(mocks.cancelCalcomBooking).toHaveBeenCalledWith('booking-owned', 'Cancelled by mentor')
    expect(mocks.refundBookingPayment).toHaveBeenCalledWith('booking-owned', 'mentor_cancelled')
  })

  it('does not call Cal.com when the booking is not owned by the mentor', async () => {
    mocks.getBookingByCalcomUidAndMentorId.mockResolvedValue(null)

    await expect(
      cancelOwnedMentorBooking('booking-owned-by-someone-else', 'Cancelled by mentor')
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })

    expect(mocks.cancelCalcomBooking).not.toHaveBeenCalled()
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
  })

  it('does not query or call Cal.com when mentor permission is denied', async () => {
    mocks.requirePermission.mockRejectedValue(new Error('Not authorized'))

    await expect(cancelOwnedMentorBooking('booking-owned', 'Cancelled by mentor')).rejects.toThrow(
      'Not authorized'
    )

    expect(mocks.getBookingByCalcomUidAndMentorId).not.toHaveBeenCalled()
    expect(mocks.cancelCalcomBooking).not.toHaveBeenCalled()
    expect(mocks.refundBookingPayment).not.toHaveBeenCalled()
  })
})
