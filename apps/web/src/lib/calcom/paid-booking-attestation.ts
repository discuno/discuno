export type PaidBookingCheckoutSnapshot = {
  actorUserId: string
  attendeeEmail: string
  eventTypeId: string
  eventDurationMinutes: string
  mentorUserId: string
  startTime: string
}

export type PaidBookingProviderSnapshot = {
  id: number
  uid: string
  status: string
  start: string
  end: string
  duration: number
  eventTypeId: number
  rescheduledFromUid?: string | null
  attendees: Array<{ email: string }>
  metadata: Record<string, unknown>
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

/**
 * Bind a current Cal.com booking to the immutable server-created Checkout.
 *
 * A mentor controls their webhook and can inspect its signing secret, so this
 * function is intentionally designed for data returned by an authenticated
 * Cal.com API read, never the webhook payload itself.
 */
export const paidCalcomBookingMatchesCheckout = ({
  booking,
  checkout,
  paymentId,
  expectedUid,
  expectedBookingId,
  expectedCurrentStart,
  rescheduledFromUid,
}: {
  booking: PaidBookingProviderSnapshot
  checkout: PaidBookingCheckoutSnapshot
  paymentId: number
  expectedUid: string
  expectedBookingId?: number
  expectedCurrentStart?: Date
  /** `null` means this must be the original Checkout booking. */
  rescheduledFromUid: string | null
}): boolean => {
  const providerStart = new Date(booking.start)
  const providerEnd = new Date(booking.end)
  const checkoutStart = new Date(checkout.startTime)
  const checkoutDuration = Number(checkout.eventDurationMinutes)
  const providerRescheduledFromUid = booking.rescheduledFromUid?.trim()
  const providerLineage = providerRescheduledFromUid?.length ? providerRescheduledFromUid : null
  const attendeeEmails = new Set(booking.attendees.map(attendee => normalizeEmail(attendee.email)))

  if (
    !Number.isSafeInteger(checkoutDuration) ||
    checkoutDuration <= 0 ||
    Number.isNaN(providerStart.getTime()) ||
    Number.isNaN(providerEnd.getTime()) ||
    Number.isNaN(checkoutStart.getTime())
  ) {
    return false
  }

  return (
    booking.uid === expectedUid &&
    (expectedBookingId === undefined || booking.id === expectedBookingId) &&
    booking.eventTypeId === Number(checkout.eventTypeId) &&
    booking.duration === checkoutDuration &&
    providerEnd.getTime() - providerStart.getTime() === checkoutDuration * 60 * 1000 &&
    (expectedCurrentStart === undefined ||
      providerStart.getTime() === expectedCurrentStart.getTime()) &&
    providerLineage === rescheduledFromUid &&
    (rescheduledFromUid !== null || providerStart.getTime() === checkoutStart.getTime()) &&
    booking.metadata.paymentId === paymentId.toString() &&
    booking.metadata.mentorUserId === checkout.mentorUserId &&
    booking.metadata.actorUserId === checkout.actorUserId &&
    attendeeEmails.has(normalizeEmail(checkout.attendeeEmail))
  )
}
