import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settleCheckoutReservationLoss } from '~/lib/services/checkout-reservation-loss'

describe('checkout reservation-loss settlement', () => {
  const findProviderBooking = vi.fn()
  const verifyAndPersistProviderBooking = vi.fn()
  const refund = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    refund.mockResolvedValue({ success: true })
  })

  it('recovers a remote booking created before local persistence failed and never refunds it', async () => {
    findProviderBooking.mockResolvedValue({ uid: 'cal_booking_after_ambiguous_create' })
    verifyAndPersistProviderBooking.mockResolvedValue('cal_booking_after_ambiguous_create')

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: true,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => true,
        refund,
      })
    ).resolves.toEqual({
      status: 'booking_recovered',
      bookingUid: 'cal_booking_after_ambiguous_create',
    })

    expect(verifyAndPersistProviderBooking).toHaveBeenCalledWith(
      'cal_booking_after_ambiguous_create'
    )
    expect(refund).not.toHaveBeenCalled()
  })

  it('fails closed when authenticated provider reconciliation is ambiguous', async () => {
    findProviderBooking.mockRejectedValue(new Error('Cal.com lookup unavailable'))

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: true,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => true,
        refund,
      })
    ).rejects.toThrow('Cal.com lookup unavailable')

    expect(verifyAndPersistProviderBooking).not.toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
  })

  it('fails closed when the recovered booking cannot be verified and persisted', async () => {
    findProviderBooking.mockResolvedValue({ uid: 'cal_booking_unverified' })
    verifyAndPersistProviderBooking.mockRejectedValue(new Error('booking attestation failed'))

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: true,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => true,
        refund,
      })
    ).rejects.toThrow('booking attestation failed')

    expect(refund).not.toHaveBeenCalled()
  })

  it('refunds only after a successful provider lookup proves no booking exists', async () => {
    findProviderBooking.mockResolvedValue(null)

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: false,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => true,
        refund,
      })
    ).resolves.toEqual({ status: 'refunded' })

    expect(refund).toHaveBeenCalledOnce()
  })

  it('does not issue another refund after the payment became held', async () => {
    findProviderBooking.mockResolvedValue(null)

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: false,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => false,
        refund,
      })
    ).resolves.toEqual({ status: 'payment_held' })

    expect(refund).not.toHaveBeenCalled()
  })

  it('never treats one negative provider read as refundable after a create POST started', async () => {
    findProviderBooking.mockResolvedValue(null)

    await expect(
      settleCheckoutReservationLoss({
        knownBookingUid: null,
        providerMutationMayBeInFlight: true,
        findProviderBooking,
        verifyAndPersistProviderBooking,
        canRefund: () => true,
        refund,
      })
    ).resolves.toEqual({ status: 'provider_absence_ambiguous' })

    expect(refund).not.toHaveBeenCalled()
  })
})
