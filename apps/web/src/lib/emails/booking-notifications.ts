// Email notification functions for booking and payment events
import { env } from '~/env'
import { resend } from '~/lib/emails'
import { AdminAlertEmail } from '~/lib/emails/templates/AdminAlert'
import { AdminManualRefundAlertEmail } from '~/lib/emails/templates/AdminManualRefundAlert'
import { BookingConfirmationEmail } from '~/lib/emails/templates/BookingConfirmation'
import { BookingFailureEmail } from '~/lib/emails/templates/BookingFailure'
import { PayoutNotificationEmail } from '~/lib/emails/templates/PayoutNotification'
import { RefundNotificationEmail } from '~/lib/emails/templates/RefundNotification'

// Type definitions for booking data
interface BookingData {
  id: string | number
  title: string
  startTime: string | Date
  duration?: number
  attendeeName?: string
  organizerName: string
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
    console.log('Sending booking confirmation email:', {
      attendeeEmail,
      mentorEmail,
      booking: {
        id: booking.id,
        title: booking.title,
        startTime: booking.startTime,
      },
    })

    const startTime = new Date(booking.startTime).toLocaleString()

    // Send to attendee
    await resend.emails.send({
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
    })

    // Send to mentor
    await resend.emails.send({
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
    })
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error)
    // Don't throw - email failure shouldn't break booking flow
  }
}

/**
 * Send refund notification email to customer
 */
export const sendRefundNotificationEmail = async ({
  customerEmail,
  amount,
  reason,
}: {
  customerEmail: string
  amount: number
  reason: string
}) => {
  try {
    console.log('Sending refund notification email:', {
      customerEmail,
      amount: (amount / 100).toFixed(2),
      reason,
    })

    await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: customerEmail,
      subject: 'Refund Processed - Your Payment Has Been Refunded',
      react: RefundNotificationEmail({
        amount,
        reason,
      }),
    })
  } catch (error) {
    console.error('Failed to send refund notification email:', error)
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
      sessionId,
      bookingError: bookingError.message,
      refundError: refundError.message,
    })

    await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: env.AUTH_EMAIL_FROM, // Send to same email as from for now
      subject: 'URGENT: Manual Refund Required',
      react: AdminManualRefundAlertEmail({
        sessionId,
        bookingError: bookingError.message,
        refundError: refundError.message,
      }),
    })
  } catch (error) {
    console.error('Failed to send admin alert email:', error)
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
    console.log('Sending payout notification email:', {
      mentorEmail,
      amount: (amount / 100).toFixed(2),
      currency,
      transferId,
    })

    await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: mentorEmail,
      subject: 'Payment Transferred - Your Earnings Are On The Way',
      react: PayoutNotificationEmail({
        amount,
        currency,
        transferId,
      }),
    })
  } catch (error) {
    console.error('Failed to send payout notification email:', error)
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
      error,
      retryCount,
    })

    await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: env.AUTH_EMAIL_FROM, // Send to same email as from for now TODO
      subject: `ALERT: ${type} - Payment ${paymentId}`,
      react: AdminAlertEmail({
        type,
        paymentId,
        error,
        retryCount,
      }),
    })
  } catch (error) {
    console.error('Failed to send admin alert email:', error)
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
}: {
  attendeeEmail: string
  attendeeName: string
  mentorName: string
  reason: string
}) => {
  try {
    console.log('Sending booking failure email:', {
      attendeeEmail,
      attendeeName,
      mentorName,
      reason,
    })

    const { data, error } = await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: attendeeEmail,
      subject: 'Booking Failed - Action Required',
      react: BookingFailureEmail({
        attendeeName,
        mentorName,
        reason,
      }),
    })
    if (error) {
      console.error('Failed to send booking failure email:', error)
    }
    console.log('Successfully sent booking failure email:', data)
  } catch (error) {
    console.error('Caught exception sending booking failure email:', error)
  }
}
