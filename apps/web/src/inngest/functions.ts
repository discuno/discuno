import { and, eq, isNull, lte, ne, or } from 'drizzle-orm'
import { NonRetriableError } from 'inngest'
import { inngest } from './client'
import { createCalcomBooking, findCalcomBookingByPaymentId } from '~/lib/calcom'
import {
  alertAdminForManualRefund,
  sendAdminAlert,
  sendBookingFailureEmail,
} from '~/lib/emails/booking-notifications'
import { trackServerEvent } from '~/lib/posthog-server'
import { refundPayment, transferMentorPayment } from '~/lib/services/payment-service'
import { db } from '~/server/db'
import { booking, payment } from '~/server/db/schema'

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
      actorUserId: string
      eventDurationMinutes: string
      payoutEligibleAt: string
      transferGroup: string
    }
    sessionAmount: number | null
    sessionCurrency: string | null
  }
}

export type ProcessMentorPayoutEvent = {
  name: 'payment/mentor-payout.scheduled'
  data: {
    paymentId: number
    calcomBookingUid: string
    payoutEligibleAt: string
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
    triggers: { event: 'stripe/checkout.completed' },
    retries: 5,
    cancelOn: [
      {
        event: 'stripe/checkout.cancelled',
        match: 'data.sessionId',
      },
    ],
    onFailure: async ({ error, event, step }) => {
      const originalEvent = event.data.event as unknown as ProcessCheckoutSideEffectsEvent
      const { paymentId, paymentIntentId, sessionId, metadata } = originalEvent.data

      // Give a successful-but-ambiguous Cal.com request time to deliver its webhook.
      await step.sleep('wait-for-cal-booking-reconciliation', '2m')
      const existingBooking = await step.run('find-existing-cal-booking', async () => {
        const [record] = await db
          .select({ calcomBookingUid: payment.calcomBookingUid })
          .from(payment)
          .where(eq(payment.id, paymentId))
          .limit(1)
        if (record?.calcomBookingUid) return record.calcomBookingUid

        const [localBooking] = await db
          .select({ calcomUid: booking.calcomUid })
          .from(booking)
          .where(eq(booking.paymentId, paymentId))
          .limit(1)
        return localBooking?.calcomUid ?? null
      })

      if (existingBooking) {
        await step.run('alert-booking-workflow-recovered', () =>
          sendAdminAlert({
            type: 'CHECKOUT_WORKFLOW_RECOVERED_BOOKING',
            paymentId,
            error: `Cal.com booking ${existingBooking} exists, but fulfillment exhausted retries: ${error.message}`,
          })
        )
        return { success: true, bookingPreserved: true }
      }

      // The final Cal.com create attempt can succeed even if its HTTP response is
      // lost. Reconcile against Cal.com itself before issuing an irreversible refund.
      const calcomReconciliation = await step.run(
        'reconcile-cal-booking-before-refund',
        async () => {
          try {
            const reconciledBooking = await findCalcomBookingByPaymentId({
              paymentId,
              attendeeEmail: metadata.attendeeEmail,
              eventTypeId: Number(metadata.eventTypeId),
            })
            if (reconciledBooking) {
              await db
                .update(payment)
                .set({ calcomBookingUid: reconciledBooking.uid, updatedAt: new Date() })
                .where(eq(payment.id, paymentId))
            }
            return { bookingUid: reconciledBooking?.uid ?? null, error: null }
          } catch (reconciliationError) {
            return {
              bookingUid: null,
              error:
                reconciliationError instanceof Error
                  ? reconciliationError.message
                  : 'Unknown Cal.com reconciliation error',
            }
          }
        }
      )

      if (calcomReconciliation.bookingUid) {
        await step.run('alert-remote-booking-workflow-recovered', () =>
          sendAdminAlert({
            type: 'CHECKOUT_WORKFLOW_RECOVERED_REMOTE_BOOKING',
            paymentId,
            error: `Cal.com booking ${calcomReconciliation.bookingUid} exists, but fulfillment exhausted retries: ${error.message}`,
          })
        )
        return { success: true, bookingPreserved: true }
      }

      if (calcomReconciliation.error) {
        await step.run('hold-ambiguous-booking-for-manual-review', async () => {
          await db
            .update(payment)
            .set({
              requiresManualReview: true,
              reviewReason: `Cal.com reconciliation failed: ${calcomReconciliation.error}`.slice(
                0,
                500
              ),
              updatedAt: new Date(),
            })
            .where(eq(payment.id, paymentId))
          await sendAdminAlert({
            type: 'CHECKOUT_BOOKING_RECONCILIATION_FAILED',
            paymentId,
            error: calcomReconciliation.error,
          })
        })
        await step.run('send-ambiguous-booking-email', () =>
          sendBookingFailureEmail({
            attendeeEmail: metadata.attendeeEmail,
            attendeeName: metadata.attendeeName,
            mentorName: metadata.mentorUsername,
            refundSucceeded: false,
            reason:
              'We could not confirm your booking safely. Please contact support so we can resolve your booking and payment.',
          })
        )
        return { success: false, manualReview: true, paymentIntentId }
      }

      const refundResult = await step.run('refund-unfulfilled-checkout', () =>
        refundPayment(paymentId, 'booking_creation_failed')
      )

      if (!refundResult.success) {
        await step.run('alert-manual-refund', () =>
          alertAdminForManualRefund(
            sessionId,
            new Error(`Cal.com booking failed after retries: ${error.message}`),
            new Error(refundResult.error ?? 'Unknown refund error')
          )
        )
      }

      await step.run('send-booking-failure-email', () =>
        sendBookingFailureEmail({
          attendeeEmail: metadata.attendeeEmail,
          attendeeName: metadata.attendeeName,
          mentorName: metadata.mentorUsername,
          refundSucceeded: refundResult.success,
          reason: refundResult.success
            ? 'We could not create your booking after several attempts. Your refund has been initiated.'
            : 'We could not create your booking. Please contact support so we can resolve your payment.',
        })
      )

      return { success: refundResult.success, paymentIntentId }
    },
  },
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
        })
        logger.info('PostHog event tracked successfully')
      } catch (error) {
        // Don't fail the entire function if PostHog tracking fails
        logger.error('Failed to track PostHog event', { error })
      }
    })

    // Step 2: Cal.com creation is retried independently. The helper reconciles
    // ambiguous responses by the payment ID before attempting another POST.
    const calcomBooking = await step.run('create-calcom-booking', async () => {
      const bookingArgs = {
        calcomEventTypeId: Number(metadata.eventTypeId),
        start: new Date(metadata.startTime).toISOString(),
        attendeeName: metadata.attendeeName,
        attendeeEmail: metadata.attendeeEmail,
        attendeePhone: metadata.attendeePhone,
        timeZone: metadata.attendeeTimeZone,
        paymentId,
        mentorUserId: metadata.mentorUserId,
        actorUserId: metadata.actorUserId,
      }

      logger.info('Creating or reconciling Cal.com booking', {
        eventTypeId: bookingArgs.calcomEventTypeId,
      })
      return createCalcomBooking(bookingArgs)
    })

    // Persist the external ID before any optional follow-on work. Cal.com's
    // signed webhook will create the normalized local booking snapshot.
    await step.run('record-calcom-booking', async () => {
      await db
        .update(payment)
        .set({ calcomBookingUid: calcomBooking.uid, updatedAt: new Date() })
        .where(eq(payment.id, paymentId))
    })

    return { success: true, bookingCreated: true, calcomBookingUid: calcomBooking.uid }
  }
)

/** Release a mentor's 85% share only after the session and support window. */
export const processMentorPayout = inngest.createFunction(
  {
    id: 'process-mentor-payout',
    name: 'Process Mentor Payout',
    triggers: { event: 'payment/mentor-payout.scheduled' },
    retries: 5,
    onFailure: async ({ error, event, step }) => {
      const originalEvent = event.data.event as unknown as ProcessMentorPayoutEvent
      await step.run('hold-payout-for-manual-review', () =>
        db
          .update(payment)
          .set({
            requiresManualReview: true,
            reviewReason: `Mentor payout retries exhausted: ${error.message}`.slice(0, 500),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payment.id, originalEvent.data.paymentId),
              ne(payment.platformStatus, 'TRANSFERRED'),
              eq(payment.requiresManualReview, false)
            )
          )
      )
      await step.run('alert-payout-failure', () =>
        sendAdminAlert({
          type: 'MENTOR_PAYOUT_EXHAUSTED_RETRIES',
          paymentId: originalEvent.data.paymentId,
          error: error.message,
        })
      )
    },
  },
  async ({ event, step, logger }) => {
    const data = event.data as ProcessMentorPayoutEvent['data']
    const payoutEligibleAt = new Date(data.payoutEligibleAt)
    if (Number.isNaN(payoutEligibleAt.getTime())) {
      throw new NonRetriableError('Invalid mentor payout eligibility date')
    }

    await step.sleepUntil('wait-for-mentor-payout-window', payoutEligibleAt)

    const result = await step.run('transfer-mentor-payment', async () => {
      const result = await transferMentorPayment({
        paymentId: data.paymentId,
        calcomBookingUid: data.calcomBookingUid,
      })
      logger.info('Mentor payout evaluated', {
        paymentId: data.paymentId,
        skipped: result.skipped ?? false,
        reason: result.reason,
        transferId: result.transferId,
      })
      return result
    })

    if (!result.success) throw new Error(result.error ?? 'Mentor payout failed')

    if (result.nextAttemptAt) {
      await step.sendEvent('reschedule-recomputed-payout-window', {
        id: `mentor-payout-${data.paymentId}-${data.calcomBookingUid}-${new Date(
          result.nextAttemptAt
        ).getTime()}-recomputed`,
        name: 'payment/mentor-payout.scheduled',
        data: {
          paymentId: data.paymentId,
          calcomBookingUid: data.calcomBookingUid,
          payoutEligibleAt: result.nextAttemptAt,
        },
      })
    }

    return result
  }
)

/** Hourly safety net for missed, delayed, or manually released payout events. */
export const reconcileEligibleMentorPayouts = inngest.createFunction(
  {
    id: 'reconcile-eligible-mentor-payouts',
    name: 'Reconcile Eligible Mentor Payouts',
    triggers: { cron: '15 * * * *' },
    retries: 5,
  },
  async ({ step }) => {
    const candidates = await step.run('load-due-mentor-payouts', () =>
      db
        .select({
          paymentId: payment.id,
          calcomBookingUid: booking.calcomUid,
          payoutEligibleAt: payment.disputePeriodEnds,
        })
        .from(payment)
        .innerJoin(booking, eq(booking.paymentId, payment.id))
        .where(
          and(
            eq(payment.platformStatus, 'SUCCEEDED'),
            eq(payment.disputeRequested, false),
            eq(payment.requiresManualReview, false),
            lte(payment.disputePeriodEnds, new Date()),
            or(
              isNull(payment.transferId),
              eq(payment.transferStatus, 'reversed'),
              eq(payment.transferStatus, 'failed')
            ),
            or(
              eq(booking.status, 'COMPLETED'),
              and(eq(booking.status, 'ACCEPTED'), lte(booking.endTime, new Date())),
              and(
                eq(booking.status, 'NO_SHOW'),
                eq(booking.attendeeNoShow, true),
                eq(booking.hostNoShow, false)
              ),
              and(eq(booking.status, 'CANCELLED'), eq(booking.mentorPayoutEligible, true))
            )
          )
        )
        .limit(100)
    )

    if (candidates.length === 0) return { queued: 0 }

    await step.sendEvent(
      'queue-reconciled-mentor-payouts',
      candidates.map(candidate => ({
        id: `payout-reconcile-${candidate.paymentId}-${candidate.calcomBookingUid}`,
        name: 'payment/mentor-payout.scheduled' as const,
        data: {
          paymentId: candidate.paymentId,
          calcomBookingUid: candidate.calcomBookingUid,
          payoutEligibleAt: new Date(candidate.payoutEligibleAt).toISOString(),
        },
      }))
    )

    return { queued: candidates.length }
  }
)
