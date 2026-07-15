import 'server-only'

type RefundResult = {
  success: boolean
}

export type CheckoutReservationLossSettlement =
  | { status: 'booking_recovered'; bookingUid: string }
  | { status: 'provider_absence_ambiguous' }
  | { status: 'payment_held' }
  | { status: 'refunded' }
  | { status: 'refund_failed' }

/**
 * Resolve a lost checkout reservation without ever refunding ahead of Cal.com.
 * Provider lookup and attestation failures deliberately escape to the durable
 * retry/manual-review path; only a successful lookup that proves no booking
 * exists may reach the refund callback.
 */
export const settleCheckoutReservationLoss = async ({
  knownBookingUid,
  providerMutationMayBeInFlight,
  findProviderBooking,
  verifyAndPersistProviderBooking,
  canRefund,
  refund,
}: {
  knownBookingUid: string | null
  providerMutationMayBeInFlight: boolean
  findProviderBooking: () => Promise<{ uid: string } | null>
  verifyAndPersistProviderBooking: (bookingUid: string) => Promise<string>
  canRefund: () => boolean | Promise<boolean>
  refund: () => Promise<RefundResult>
}): Promise<CheckoutReservationLossSettlement> => {
  const providerBooking = knownBookingUid ? { uid: knownBookingUid } : await findProviderBooking()

  if (providerBooking) {
    const bookingUid = await verifyAndPersistProviderBooking(providerBooking.uid)
    return { status: 'booking_recovered', bookingUid }
  }

  // A negative list read is not proof that an already-sent provider mutation
  // cannot still commit. Once a Cal.com POST crossed our process boundary, only
  // a recovered booking or operator reconciliation may settle the payment.
  if (providerMutationMayBeInFlight) return { status: 'provider_absence_ambiguous' }

  if (!(await canRefund())) return { status: 'payment_held' }

  const refundResult = await refund()
  return refundResult.success ? { status: 'refunded' } : { status: 'refund_failed' }
}
