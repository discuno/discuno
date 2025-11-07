import { eq } from 'drizzle-orm'
import { NonRetriableError } from 'inngest'
import { inngest } from './client'
import { createCalcomBooking } from '~/lib/calcom'
import {
  alertAdminForManualRefund,
  sendBookingFailureEmail,
} from '~/lib/emails/booking-notifications'
import { trackServerEvent } from '~/lib/posthog-server'
import { refundStripePaymentIntent } from '~/lib/stripe/refund'
import { db } from '~/server/db'
import { payment } from '~/server/db/schema/index'

/**
 * Event types for Inngest functions
 */
export type ProcessCheckoutSideEffectsEvent = {
  name: 'stripe/checkout.completed'
  data: {
    paymentId: number
    paymentIntentId: string
    sessionId: string
    metadata: {
      mentorUserId: string
      eventTypeId: string
      startTime: string
      attendeeName: string
      attendeeEmail: string
      attendeePhone?: string
      attendeeTimeZone: string
      mentorUsername: string
      mentorFee: string
      menteeFee: string
      mentorAmount: string
      mentorStripeAccountId: string
    }
    sessionAmount: number | null
    sessionCurrency: string | null
  }
}

/**
 * Process checkout session side effects
 *
 * This function handles:
 * 1. PostHog event tracking
 * 2. Cal.com booking creation
 * 3. Refunds (if booking fails)
 * 4. Admin alerts (if refund fails)
 * 5. Failure emails
 *
 * Inngest provides automatic retries with exponential backoff
 */
export const processCheckoutSideEffects = inngest.createFunction(
  {
    id: 'process-checkout-side-effects',
    name: 'Process Checkout Session Side Effects',
    retries: 3,
    cancelOn: [
      {
        event: 'stripe/checkout.cancelled',
        match: 'data.sessionId',
      },
    ],
  },
  { event: 'stripe/checkout.completed' },
  async ({ event, step, logger }) => {
    const { paymentId, paymentIntentId, sessionId, metadata, sessionAmount, sessionCurrency } =
      event.data

    logger.info('Processing checkout side effects', { sessionId, paymentIntentId })

    // Step 1: Track payment success in PostHog
    await step.run('track-payment-posthog', async () => {
      try {
        await trackServerEvent(metadata.mentorUserId, 'payment_succeeded', {
          sessionId,
          paymentIntentId,
          amount: sessionAmount,
          currency: sessionCurrency,
          mentorFee: parseInt(metadata.mentorFee),
          mentorAmount: parseInt(metadata.mentorAmount),
          customerEmail: metadata.attendeeEmail,
        })
        logger.info('PostHog event tracked successfully')
      } catch (error) {
        // Don't fail the entire function if PostHog tracking fails
        logger.error('Failed to track PostHog event', { error })
      }
    })

    // Step 2: Create Cal.com booking
    try {
      await step.run('create-calcom-booking', async () => {
        const bookingArgs = {
          calcomEventTypeId: Number(metadata.eventTypeId),
          start: new Date(metadata.startTime).toISOString(),
          attendeeName: metadata.attendeeName,
          attendeeEmail: metadata.attendeeEmail,
          attendeePhone: metadata.attendeePhone,
          timeZone: metadata.attendeeTimeZone,
          paymentId: paymentId,
          mentorUserId: metadata.mentorUserId,
        }

        logger.info('Creating Cal.com booking', { eventTypeId: bookingArgs.calcomEventTypeId })

        await createCalcomBooking(bookingArgs)

        logger.info('Cal.com booking created successfully')
      })

      return { success: true, bookingCreated: true }
    } catch (bookingError) {
      logger.error('Cal.com booking failed', { error: bookingError })

      // Step 3: Refund payment if booking failed
      const refundResult = await step.run('refund-payment', async () => {
        try {
          const result = await refundStripePaymentIntent(paymentIntentId)
          if (result.success) {
            logger.info('Refund successful', { paymentIntentId })
          } else {
            logger.error('Refund failed', { paymentIntentId, error: result.error })
          }
          return result
        } catch (refundError) {
          logger.error('Refund error', { error: refundError })
          return { success: false, error: 'Refund exception thrown' }
        }
      })

      // Step 4: Alert admin if refund failed (critical)
      if (!refundResult.success) {
        await step.run('alert-admin', async () => {
          try {
            await alertAdminForManualRefund(
              sessionId,
              bookingError instanceof Error ? bookingError : new Error('Cal.com booking failed'),
              new Error(refundResult.error ?? 'Unknown refund error')
            )
            logger.info('Admin alert sent')
          } catch (alertError) {
            logger.error('Failed to send admin alert', { error: alertError })
            // Don't fail - admin will see this in Inngest dashboard
          }
        })
      }

      // Step 5: Update payment status to FAILED
      await step.run('update-payment-status', async () => {
        try {
          await db
            .update(payment)
            .set({ platformStatus: 'FAILED' })
            .where(eq(payment.stripePaymentIntentId, paymentIntentId))
          logger.info('Payment status updated to FAILED')
        } catch (dbError) {
          logger.error('Failed to update payment status', { error: dbError })
          throw dbError // Retry this critical operation
        }
      })

      // Step 6: Send failure email to customer
      await step.run('send-failure-email', async () => {
        try {
          await sendBookingFailureEmail({
            attendeeEmail: metadata.attendeeEmail,
            attendeeName: metadata.attendeeName,
            mentorName: metadata.mentorUsername,
            reason: refundResult.success
              ? 'An unexpected error occurred while creating your booking. Your payment has been refunded.'
              : 'An unexpected error occurred while creating your booking. Please contact support regarding your payment.',
          })
          logger.info('Failure email sent')
        } catch (emailError) {
          logger.error('Failed to send failure email', { error: emailError })
          // Don't fail - customer can contact support
        }
      })

      // Throw NonRetriableError since we've handled the failure
      throw new NonRetriableError('Booking creation failed, refund and notifications processed')
    }
  }
)
