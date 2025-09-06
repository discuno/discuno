// Email notification functions for booking and payment events
import sgMail from '@sendgrid/mail'
import { env } from '~/env'

// Initialize SendGrid
sgMail.setApiKey(env.SENDGRID_API_KEY)

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
    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: attendeeEmail,
      subject: 'Booking Confirmed - Your Session is Scheduled',
      html: `
        <h2>Your booking is confirmed!</h2>
        <p>Hi ${booking.attendeeName ?? 'there'},</p>
        <p>Your session has been successfully booked:</p>
        <ul>
          <li><strong>Session:</strong> ${booking.title}</li>
          <li><strong>Mentor:</strong> ${booking.organizerName}</li>
          <li><strong>Date & Time:</strong> ${startTime}</li>
          <li><strong>Duration:</strong> ${booking.duration ?? 30} minutes</li>
        </ul>
        <p>We'll send you calendar details and meeting links closer to the session time.</p>
        <p>Best regards,<br>The Discuno Team</p>
      `,
    })

    // Send to mentor
    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: mentorEmail,
      subject: 'New Booking - You have a scheduled session',
      html: `
        <h2>New booking received!</h2>
        <p>Hi ${booking.organizerName},</p>
        <p>You have a new session booked:</p>
        <ul>
          <li><strong>Session:</strong> ${booking.title}</li>
          <li><strong>Student:</strong> ${booking.attendeeName}</li>
          <li><strong>Date & Time:</strong> ${startTime}</li>
          <li><strong>Duration:</strong> ${booking.duration ?? 30} minutes</li>
        </ul>
        <p>Please prepare for your session and check your calendar for meeting details.</p>
        <p>Best regards,<br>The Discuno Team</p>
      `,
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

    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: customerEmail,
      subject: 'Refund Processed - Your Payment Has Been Refunded',
      html: `
        <h2>Refund Processed</h2>
        <p>Hi there,</p>
        <p>We've processed a refund for your recent booking:</p>
        <ul>
          <li><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</li>
          <li><strong>Reason:</strong> ${reason}</li>
        </ul>
        <p>The refund should appear in your account within 5-10 business days.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Discuno Team</p>
      `,
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

    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: env.AUTH_EMAIL_FROM, // Send to same email as from for now
      subject: 'URGENT: Manual Refund Required',
      html: `
        <h2 style="color: #dc2626;">URGENT: Manual Refund Required</h2>
        <p>A booking failed after payment was processed and automatic refund also failed.</p>
        <p><strong>Immediate action required!</strong></p>
        <ul>
          <li><strong>Session ID:</strong> ${sessionId}</li>
          <li><strong>Booking Error:</strong> ${bookingError.message}</li>
          <li><strong>Refund Error:</strong> ${refundError.message}</li>
        </ul>
        <p>Please manually process the refund through Stripe dashboard.</p>
      `,
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

    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: mentorEmail,
      subject: 'Payment Transferred - Your Earnings Are On The Way',
      html: `
        <h2>Payment Transferred!</h2>
        <p>Great news! Your earnings have been transferred:</p>
        <ul>
          <li><strong>Amount:</strong> $${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</li>
          <li><strong>Transfer ID:</strong> ${transferId}</li>
        </ul>
        <p>The funds should appear in your connected bank account within 1-3 business days.</p>
        <p>You can view more details in your Stripe dashboard.</p>
        <p>Best regards,<br>The Discuno Team</p>
      `,
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

    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: env.AUTH_EMAIL_FROM, // Send to same email as from for now
      subject: `ALERT: ${type} - Payment ${paymentId}`,
      html: `
        <h2 style="color: #dc2626;">Payment System Alert</h2>
        <p><strong>Alert Type:</strong> ${type}</p>
        <p><strong>Payment ID:</strong> ${paymentId}</p>
        <p><strong>Error:</strong> ${error}</p>
        ${retryCount ? `<p><strong>Retry Count:</strong> ${retryCount}</p>` : ''}
        <p>Please check the payment system and take appropriate action.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
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

    await sgMail.send({
      from: env.AUTH_EMAIL_FROM,
      to: attendeeEmail,
      subject: 'Booking Failed - Action Required',
      html: `
      <div style="font-family: var(--font-sans); color: var(--color-foreground); background-color: var(--color-background); padding: 2rem;">
        <div style="max-width: 600px; margin: auto; background-color: var(--color-card); border-radius: var(--radius); padding: 2rem; border: 1px solid var(--color-border);">
          <h2 style="font-size: 1.5rem; font-weight: 600; color: var(--color-destructive);">Booking Failed</h2>
          <p>Hi ${attendeeName},</p>
          <p>Unfortunately, we were unable to complete your booking with ${mentorName}.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Your payment has been automatically refunded and should appear in your account within 5-10 business days.</p>
          <p>We apologize for the inconvenience. Please try booking again or contact support if the issue persists.</p>
          <p>Best regards,<br>The Discuno Team</p>
        </div>
      </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send booking failure email:', error)
  }
}
