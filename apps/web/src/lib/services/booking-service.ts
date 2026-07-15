import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import { cancelCalcomBooking } from '~/lib/calcom'
import { ExternalApiError } from '~/lib/errors'
import {
  holdBookingPaymentForManualReview,
  refundBookingPayment,
  scheduleBookingMentorPayout,
} from '~/lib/services/payment-service'
import {
  type BookingLifecycle,
  type RecordBookingLifecycleInput,
  claimBookingLifecycleSideEffects,
  completeAcceptedBooking,
  createBooking,
  cancelBooking as cancelBookingDal,
  getBookingLifecycleContextByCalcomUid,
  getBookingLifecycle,
  markBookingLifecycleSideEffectsCompleted,
  recordBookingLifecycleEvent,
  releaseBookingLifecycleSideEffectsClaim,
  setBookingMentorPayoutEligibility,
  updateBookingStatus,
} from '~/server/dal/bookings'
import { requireOwnedMentorBooking } from '~/server/queries/bookings'

/**
 * Services Layer for booking management
 * Handles booking creation, cancellation, and status updates
 */

/**
 * Create a booking with organizer and attendee
 */
type CreateLocalBooking = NewBooking & {
  duration: number
  calcomEventTypeId: number
  calcomUserId?: number
  lifecycleEventCreatedAt?: Date
  rescheduledFromUid?: string
  supersededByUid?: string
  organizer: Omit<NewBookingOrganizer, 'bookingId'>
  attendee: Omit<NewBookingAttendee, 'bookingId'>
  meetingUrl?: string
}

export const createLocalBooking = async (input: CreateLocalBooking) => {
  const result = await createBooking(input)
  await reconcileBookingLifecycleFinancials(result.lifecycle)
  return result
}

const assertPaymentOperationSucceeded = (
  result: { success: boolean; error?: string },
  fallback: string
) => {
  if (!result.success) throw new Error(result.error ?? fallback)
}

/**
 * Apply the durable lifecycle's money decision. Payment operations are already
 * idempotent; the completion marker prevents unnecessary replays while still
 * allowing a crash between the external operation and marker write to retry.
 */
export const reconcileBookingLifecycleFinancials = async (
  lifecycle: BookingLifecycle
): Promise<void> => {
  if (lifecycle.state === 'ACTIVE' || lifecycle.sideEffectsCompletedAt) return

  const claimedAt = await claimBookingLifecycleSideEffects(lifecycle)
  if (!claimedAt) {
    const current = await getBookingLifecycle(lifecycle.calcomUid, lifecycle.mentorUserId)
    if (
      !current ||
      current.state !== lifecycle.state ||
      current.eventCreatedAt.getTime() !== lifecycle.eventCreatedAt.getTime() ||
      current.sideEffectsCompletedAt
    ) {
      return
    }
    // A live worker owns the decision. Returning success here could cause the
    // durable inbox to acknowledge the only retry after that worker crashes.
    throw new Error(`Cal.com lifecycle reconciliation is already in progress`)
  }

  try {
    switch (lifecycle.financialDisposition) {
      case 'NONE':
        break
      case 'REFUND_EARLY_CANCELLATION':
        assertPaymentOperationSucceeded(
          await refundBookingPayment(lifecycle.calcomUid, 'early_cancellation'),
          'Early-cancellation refund failed'
        )
        break
      case 'REFUND_MENTOR_CANCELLATION':
        assertPaymentOperationSucceeded(
          await refundBookingPayment(lifecycle.calcomUid, 'mentor_cancelled'),
          'Mentor-cancellation refund failed'
        )
        break
      case 'REFUND_PROVIDER_REJECTION':
        assertPaymentOperationSucceeded(
          await refundBookingPayment(lifecycle.calcomUid, 'provider_rejected'),
          'Rejected-booking refund failed'
        )
        break
      case 'HOLD_LATE_CANCELLATION':
        assertPaymentOperationSucceeded(
          await holdBookingPaymentForManualReview(
            lifecycle.calcomUid,
            'late cancellation could not be attributed to a host or attendee'
          ),
          'Cancellation review hold failed'
        )
        break
      case 'PAYOUT_LATE_CANCELLATION':
        assertPaymentOperationSucceeded(
          await scheduleBookingMentorPayout(lifecycle.calcomUid, 'late-mentee-cancellation'),
          'Late-cancellation mentor payout scheduling failed'
        )
        break
      case 'REFUND_MENTOR_NO_SHOW':
        assertPaymentOperationSucceeded(
          await refundBookingPayment(lifecycle.calcomUid, 'mentor_no_show'),
          'Host no-show refund failed'
        )
        break
      case 'PAYOUT_ATTENDEE_NO_SHOW':
        assertPaymentOperationSucceeded(
          await scheduleBookingMentorPayout(lifecycle.calcomUid, 'attendee-no-show'),
          'Attendee no-show mentor payout scheduling failed'
        )
        break
      case 'PAYOUT_COMPLETED':
        assertPaymentOperationSucceeded(
          await scheduleBookingMentorPayout(lifecycle.calcomUid, 'meeting-completed'),
          'Completed-session mentor payout scheduling failed'
        )
        break
    }

    await markBookingLifecycleSideEffectsCompleted(lifecycle, claimedAt)
  } catch (error) {
    await releaseBookingLifecycleSideEffectsClaim(lifecycle, claimedAt)
    throw error
  }
}

/** Persist and reconcile a terminal/mutable Cal.com lifecycle event. */
export const recordLocalBookingLifecycle = async (input: RecordBookingLifecycleInput) => {
  const result = await recordBookingLifecycleEvent(input)
  if (!result.missing) await reconcileBookingLifecycleFinancials(result.lifecycle)
  return result
}

export const getLocalBookingLifecycleContext = async (calcomBookingUid: string) =>
  getBookingLifecycleContextByCalcomUid(calcomBookingUid)

/**
 * Cancel a booking
 */
export const cancelLocalBooking = async (calcomBookingUid: string) => {
  return cancelBookingDal(calcomBookingUid)
}

/** Persist whether a cancelled booking still earns the mentor payout. */
export const setLocalBookingMentorPayoutEligibility = async (
  calcomBookingUid: string,
  mentorPayoutEligible: boolean
) => setBookingMentorPayoutEligibility(calcomBookingUid, mentorPayoutEligible)

/**
 * Cancel a Cal.com booking after proving it belongs to the authenticated mentor.
 * Authorization must complete before the external API is called.
 */
export const cancelOwnedMentorBooking = async (
  calcomBookingUid: string,
  cancellationReason: string
) => {
  const booking = await requireOwnedMentorBooking(calcomBookingUid)
  await cancelCalcomBooking(booking.mentorUserId, calcomBookingUid, cancellationReason)
  const refund = await refundBookingPayment(calcomBookingUid, 'mentor_cancelled')
  if (!refund.success) {
    throw new ExternalApiError('The booking was cancelled, but its refund needs manual review')
  }
}

/**
 * Complete an accepted booking once without overwriting no-show/cancelled state.
 */
export const completeLocalBooking = async (calcomBookingUid: string) => {
  return completeAcceptedBooking(calcomBookingUid)
}

/**
 * Update booking status
 */
export const updateLocalBookingStatus = async (
  calcomBookingUid: string,
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
  options?: {
    hostNoShow?: boolean
    attendeeNoShow?: boolean
  }
) => {
  return updateBookingStatus(calcomBookingUid, status, options)
}
