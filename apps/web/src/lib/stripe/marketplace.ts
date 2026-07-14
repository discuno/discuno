export const PLATFORM_COMMISSION_BASIS_POINTS = 1500
export const BASIS_POINTS = 10_000
export const MENTOR_PAYOUT_DELAY_HOURS = 72
export const FULL_REFUND_CANCELLATION_HOURS = 24

export const calculateMarketplaceAmounts = (listedPrice: number) => {
  if (!Number.isInteger(listedPrice) || listedPrice < 0) {
    throw new Error('Listed price must be a non-negative integer')
  }

  const mentorFee = Math.round((listedPrice * PLATFORM_COMMISSION_BASIS_POINTS) / BASIS_POINTS)

  return {
    listedPrice,
    menteeFee: 0,
    mentorFee,
    mentorAmount: listedPrice - mentorFee,
  }
}

export const getMentorPayoutEligibleAt = (
  startTime: Date | string,
  durationMinutes: number
): Date => {
  const start = new Date(startTime)
  if (Number.isNaN(start.getTime())) throw new Error('Invalid booking start time')
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('Duration must be a positive integer')
  }

  return new Date(
    start.getTime() + durationMinutes * 60 * 1000 + MENTOR_PAYOUT_DELAY_HOURS * 60 * 60 * 1000
  )
}

export const shouldAutomaticallyRefundCancellation = ({
  cancelledByEmail,
  organizerEmail,
  startTime,
  now = new Date(),
}: {
  cancelledByEmail?: string | null
  organizerEmail: string
  startTime: Date | string
  now?: Date
}): boolean => {
  const normalizedCanceller = cancelledByEmail?.trim().toLowerCase()
  if (normalizedCanceller && normalizedCanceller === organizerEmail.trim().toLowerCase()) {
    return true
  }

  const start = new Date(startTime)
  if (Number.isNaN(start.getTime())) return false

  return start.getTime() - now.getTime() >= FULL_REFUND_CANCELLATION_HOURS * 60 * 60 * 1000
}

export const isMentorPayoutEligibleBooking = ({
  status,
  endTime,
  hostNoShow,
  attendeeNoShow,
  mentorPayoutEligible,
  now = new Date(),
}: {
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | 'COMPLETED' | 'NO_SHOW'
  endTime: Date | string
  hostNoShow?: boolean | null
  attendeeNoShow?: boolean | null
  mentorPayoutEligible?: boolean | null
  now?: Date
}): boolean => {
  if (status === 'COMPLETED') return true
  if (status === 'CANCELLED') return mentorPayoutEligible === true
  if (status === 'NO_SHOW') return attendeeNoShow === true && hostNoShow !== true
  if (status !== 'ACCEPTED') return false

  const end = new Date(endTime)
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()
}

export const getExpandableId = <T extends { id: string }>(
  value: string | T | null | undefined
): string | null => (typeof value === 'string' ? value : (value?.id ?? null))

export type ReconciledDisputeState = 'active' | 'lost' | 'released'

export const getReconciledDisputeState = (
  status:
    | 'needs_response'
    | 'under_review'
    | 'won'
    | 'lost'
    | 'warning_needs_response'
    | 'warning_under_review'
    | 'warning_closed'
    | 'prevented'
): ReconciledDisputeState => {
  switch (status) {
    case 'lost':
      return 'lost'
    case 'won':
    case 'warning_closed':
    case 'prevented':
      return 'released'
    case 'needs_response':
    case 'under_review':
    case 'warning_needs_response':
    case 'warning_under_review':
      return 'active'
  }
}

export type StripeRefundStatus = 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled'

export const shouldReverseMentorTransferForRefundStatus = (status: StripeRefundStatus): boolean =>
  status === 'succeeded' || status === 'pending' || status === 'requires_action'

export const normalizeStripeRefundStatus = (status: string | null): StripeRefundStatus => {
  switch (status) {
    case 'pending':
    case 'requires_action':
    case 'succeeded':
    case 'failed':
    case 'canceled':
      return status
    default:
      return 'failed'
  }
}

export const getPlatformStatusForRefund = (
  status: StripeRefundStatus
): 'PROCESSING' | 'REFUNDED' | 'FAILED' => {
  switch (status) {
    case 'succeeded':
      return 'REFUNDED'
    case 'pending':
    case 'requires_action':
      return 'PROCESSING'
    case 'failed':
    case 'canceled':
      return 'FAILED'
  }
}
