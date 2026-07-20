// Email notification functions for booking and payment events
import { env } from '~/env'
import { sendEmail } from '~/lib/emails'
import { AdminAlertEmail } from '~/lib/emails/templates/AdminAlert'
import { AdminManualRefundAlertEmail } from '~/lib/emails/templates/AdminManualRefundAlert'
import { BookingConfirmationEmail } from '~/lib/emails/templates/BookingConfirmation'
import { BookingFailureEmail } from '~/lib/emails/templates/BookingFailure'
import { PayoutNotificationEmail } from '~/lib/emails/templates/PayoutNotification'
import { RefundNotificationEmail } from '~/lib/emails/templates/RefundNotification'
import { getSafeErrorName } from '~/lib/operational-logging'

// Type definitions for booking data
interface BookingData {
  id: string | number
  title: string
  startTime: string | Date
  duration?: number
  attendeeName?: string
  organizerName: string
}

/** Notify operations when an automated recovery path deliberately stops retrying. */
export const sendOperationalAlert = async ({
  type,
  reference,
  summary,
}: {
  type: string
  reference: string
  summary: string
}): Promise<boolean> => {
  try {
    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: env.ADMIN_ALERT_EMAIL,
        subject: `Discuno operational alert: ${type}`,
        text: [`Alert: ${type}`, `Reference: ${reference}`, summary].join('\n'),
      },
      `operational-alert/${type}/${reference}`
    )
    return true
  } catch (error) {
    console.error('Failed to deliver operational alert', {
      type,
      errorName: getSafeErrorName(error),
    })
    return false
  }
}

/**
 * Send booking confirmation email to both attendee and mentor
 */
export const sendBookingConfirmationEmail = async ({
  attendeeEmail,
  mentorEmail,
  booking,
}: {
  attendeeEmail: string
  mentorEmail: string
  booking: BookingData
}) => {
  try {
    console.info('Booking confirmation delivery started', { bookingId: booking.id })

    const startTime = new Date(booking.startTime).toLocaleString()

    // Send to attendee
    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: attendeeEmail,
        subject: 'Booking Confirmed - Your Session is Scheduled',
        react: BookingConfirmationEmail({
          attendeeName: booking.attendeeName,
          organizerName: booking.organizerName,
          title: booking.title,
          startTime,
          duration: booking.duration,
          isMentor: false,
        }),
      },
      `booking-confirmation-attendee/${booking.id}`
    )

    // Send to mentor
    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: mentorEmail,
        subject: 'New Booking - You have a scheduled session',
        react: BookingConfirmationEmail({
          attendeeName: booking.attendeeName,
          organizerName: booking.organizerName,
          title: booking.title,
          startTime,
          duration: booking.duration,
          isMentor: true,
        }),
      },
      `booking-confirmation-mentor/${booking.id}`
    )
    return true
  } catch (error) {
    console.error('Failed to send booking confirmation email', {
      errorName: getSafeErrorName(error),
    })
    // Don't throw - email failure shouldn't break booking flow
    return false
  }
}

/**
 * Send refund notification email to customer
 */
export const sendRefundNotificationEmail = async ({
  customerEmail,
  amount,
  reason,
  paymentId,
}: {
  customerEmail: string
  amount: number
  reason: string
  paymentId: number
}) => {
  try {
    console.info('Refund notification delivery started', { paymentId })

    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: customerEmail,
        subject: 'Refund Processed - Your Payment Has Been Refunded',
        react: RefundNotificationEmail({
          amount,
          reason,
        }),
      },
      `refund-notification/${paymentId}`
    )
    return true
  } catch (error) {
    console.error('Failed to send refund notification email', {
      paymentId,
      errorName: getSafeErrorName(error),
    })
    return false
  }
}

/**
 * Alert admin for manual refund requirements
 */
export const alertAdminForManualRefund = async (
  sessionId: string,
  bookingError: Error,
  refundError: Error
) => {
  try {
    console.error('URGENT: Manual refund required', {
      bookingErrorName: getSafeErrorName(bookingError),
      refundErrorName: getSafeErrorName(refundError),
    })

    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: env.ADMIN_ALERT_EMAIL,
        subject: 'URGENT: Manual Refund Required',
        react: AdminManualRefundAlertEmail({
          sessionId,
          bookingError: bookingError.message,
          refundError: refundError.message,
        }),
      },
      `manual-refund-alert/${sessionId}`
    )
  } catch (error) {
    console.error('Failed to send admin alert email', {
      errorName: getSafeErrorName(error),
    })
  }
}

/**
 * Send payout notification email to mentor
 */
export const sendPayoutNotificationEmail = async ({
  mentorEmail,
  amount,
  currency,
  transferId,
}: {
  mentorEmail: string
  amount: number
  currency: string
  transferId: string
}) => {
  try {
    console.info('Payout notification delivery started')

    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: mentorEmail,
        subject: 'Payment Transferred - Your Earnings Are On The Way',
        react: PayoutNotificationEmail({
          amount,
          currency,
          transferId,
        }),
      },
      `payout-notification/${transferId}`
    )
  } catch (error) {
    console.error('Failed to send payout notification email', {
      errorName: getSafeErrorName(error),
    })
  }
}

/**
 * Send admin alert for various payment issues
 */
export const sendAdminAlert = async ({
  type,
  paymentId,
  error,
  retryCount,
}: {
  type: string
  paymentId: number
  error: string
  retryCount?: number
}) => {
  try {
    console.error('ADMIN ALERT:', {
      type,
      paymentId,
      retryCount,
    })

    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: env.ADMIN_ALERT_EMAIL,
        subject: `ALERT: ${type} - Payment ${paymentId}`,
        react: AdminAlertEmail({
          type,
          paymentId,
          error,
          retryCount,
        }),
      },
      `admin-alert/${type}/${paymentId}/${retryCount ?? 0}`
    )
  } catch (error) {
    console.error('Failed to send admin alert email', {
      type,
      paymentId,
      errorName: getSafeErrorName(error),
    })
  }
}

/**
 * Send booking failure email to the attendee
 */
export const sendBookingFailureEmail = async ({
  attendeeEmail,
  attendeeName,
  mentorName,
  reason,
  refundSucceeded,
  paymentId,
}: {
  attendeeEmail: string
  attendeeName: string
  mentorName: string
  reason: string
  refundSucceeded: boolean
  paymentId: number
}) => {
  try {
    console.info('Booking failure notification delivery started', { paymentId })

    await sendEmail(
      {
        from: env.AUTH_EMAIL_FROM,
        to: attendeeEmail,
        subject: 'Booking Failed - Action Required',
        react: BookingFailureEmail({
          attendeeName,
          mentorName,
          reason,
          refundSucceeded,
        }),
      },
      `booking-failure/${paymentId}`
    )
    console.info('Booking failure notification delivered', { paymentId })
    return true
  } catch (error) {
    console.error('Failed to send booking failure email', {
      paymentId,
      errorName: getSafeErrorName(error),
    })
    return false
  }
}
