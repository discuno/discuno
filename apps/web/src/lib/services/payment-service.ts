import 'server-only'

import { and, desc, eq, isNull, like, ne, or, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { inngest } from '~/inngest/client'
import {
  sendAdminAlert,
  sendPayoutNotificationEmail,
  sendRefundNotificationEmail,
} from '~/lib/emails/booking-notifications'
import { stripe } from '~/lib/stripe'
import {
  getExpandableId,
  getMentorPayoutEligibleAt,
  getPlatformStatusForRefund,
  getReconciledDisputeState,
  isMentorPayoutEligibleBooking,
  MENTOR_PAYOUT_DELAY_HOURS,
  normalizeStripeRefundStatus,
  shouldReverseMentorTransferForRefundStatus,
} from '~/lib/stripe/marketplace'
import { refundStripePaymentIntent } from '~/lib/stripe/refund'
import { db } from '~/server/db'
import {
  booking,
  bookingOrganizer,
  payment,
  paymentDispute,
  paymentRefund,
  paymentTransfer,
  user,
} from '~/server/db/schema'

type PaymentOperationResult = {
  success: boolean
  skipped?: boolean
  error?: string
  reason?: string
  nextAttemptAt?: string
}

const PAYMENT_OPERATION_LOCK_NAMESPACE = 1_144_337_921
const DIRECT_PAYOUT_SCHEDULE_HORIZON_MS = 6 * 24 * 60 * 60 * 1000

/** Serialize money-moving work for one payment across serverless requests. */
const withPaymentOperationLock = async <T>(
  paymentId: number,
  operation: () => Promise<T>
): Promise<T> =>
  db.transaction(async tx => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${PAYMENT_OPERATION_LOCK_NAMESPACE}, ${paymentId})`
    )
    return operation()
  })

const persistTransferSnapshot = async ({
  paymentId,
  transfer,
  generation,
  status,
}: {
  paymentId: number
  transfer: Stripe.Transfer
  generation: number
  status: string
}) => {
  const destinationAccountId = getExpandableId(transfer.destination)
  const sourceChargeId = getExpandableId(transfer.source_transaction)
  if (!destinationAccountId || !sourceChargeId) {
    throw new Error(`Stripe transfer ${transfer.id} is missing its destination or source charge`)
  }

  await db
    .insert(paymentTransfer)
    .values({
      paymentId,
      stripeTransferId: transfer.id,
      generation,
      amount: transfer.amount,
      reversedAmount: transfer.amount_reversed,
      currency: transfer.currency.toUpperCase(),
      destinationAccountId,
      sourceChargeId,
      status,
      metadata: transfer.metadata,
    })
    .onConflictDoUpdate({
      target: paymentTransfer.stripeTransferId,
      set: {
        reversedAmount: transfer.amount_reversed,
        status,
        metadata: transfer.metadata,
        updatedAt: new Date(),
      },
    })
}

const persistRefundSnapshot = async ({
  paymentId,
  refundId,
  amount,
  currency,
  status,
  purpose,
  metadata,
}: {
  paymentId: number
  refundId: string
  amount: number
  currency: string
  status: string
  purpose?: string
  metadata?: Record<string, string>
}) =>
  db
    .insert(paymentRefund)
    .values({
      paymentId,
      stripeRefundId: refundId,
      amount,
      currency: currency.toUpperCase(),
      status,
      purpose,
      metadata: metadata ?? {},
    })
    .onConflictDoUpdate({
      target: paymentRefund.stripeRefundId,
      set: {
        amount,
        status,
        purpose,
        metadata: metadata ?? {},
        updatedAt: new Date(),
      },
    })

const getStoredDisputeState = async (
  paymentId: number
): Promise<'active' | 'lost' | 'released'> => {
  const disputeStates = await db
    .select({ state: paymentDispute.state })
    .from(paymentDispute)
    .where(eq(paymentDispute.paymentId, paymentId))
  if (disputeStates.some(item => item.state === 'active')) return 'active'
  if (disputeStates.some(item => item.state === 'lost')) return 'lost'
  return 'released'
}

const sendRefundNotificationOnce = async ({
  paymentId,
  customerEmail,
  amount,
  reason,
}: {
  paymentId: number
  customerEmail: string
  amount: number
  reason: string
}) => {
  const claimedAt = new Date()
  const [claimed] = await db
    .update(payment)
    .set({ refundNotifiedAt: claimedAt, updatedAt: claimedAt })
    .where(and(eq(payment.id, paymentId), isNull(payment.refundNotifiedAt)))
    .returning({ id: payment.id })

  if (!claimed) return
  const sent = await sendRefundNotificationEmail({ customerEmail, amount, reason })
  if (!sent) {
    await db
      .update(payment)
      .set({ refundNotifiedAt: null, updatedAt: new Date() })
      .where(and(eq(payment.id, paymentId), eq(payment.refundNotifiedAt, claimedAt)))
  }
}

export const scheduleMentorPayout = async ({
  paymentId,
  calcomBookingUid,
  payoutEligibleAt,
  reason,
}: {
  paymentId: number
  calcomBookingUid: string
  payoutEligibleAt: Date | string
  reason: string
}): Promise<void> => {
  const eligibleAt = new Date(payoutEligibleAt)
  if (Number.isNaN(eligibleAt.getTime())) throw new Error('Invalid mentor payout date')
  // Inngest plan limits can cap long sleeps; the hourly reconciler handles distant bookings.
  if (eligibleAt.getTime() - Date.now() > DIRECT_PAYOUT_SCHEDULE_HORIZON_MS) return

  const eventReason = reason.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
  await inngest.send({
    id: `mentor-payout-${paymentId}-${calcomBookingUid}-${eligibleAt.getTime()}-${eventReason}`,
    name: 'payment/mentor-payout.scheduled',
    data: {
      paymentId,
      calcomBookingUid,
      payoutEligibleAt: eligibleAt.toISOString(),
    },
  })
}

export const scheduleBookingMentorPayout = async (
  calcomBookingUid: string,
  reason: string
): Promise<PaymentOperationResult> => {
  const [record] = await db
    .select({
      paymentId: booking.paymentId,
      payoutEligibleAt: payment.disputePeriodEnds,
    })
    .from(booking)
    .innerJoin(payment, eq(payment.id, booking.paymentId))
    .where(eq(booking.calcomUid, calcomBookingUid))
    .limit(1)

  if (!record?.paymentId) return { success: true, skipped: true, reason: 'unpaid_booking' }

  await scheduleMentorPayout({
    paymentId: record.paymentId,
    calcomBookingUid,
    payoutEligibleAt: record.payoutEligibleAt,
    reason,
  })
  return { success: true }
}

const clearRecoveredTransferReversalReview = async (paymentId: number) => {
  await db
    .update(payment)
    .set({ requiresManualReview: false, reviewReason: null, updatedAt: new Date() })
    .where(and(eq(payment.id, paymentId), like(payment.reviewReason, 'Transfer reversal failed:%')))
}

const reverseMentorTransfer = async ({
  paymentId,
  transferId,
  existingReversalId,
  purpose,
}: {
  paymentId: number
  transferId: string | null
  existingReversalId: string | null
  purpose: string
}): Promise<PaymentOperationResult> => {
  if (!transferId) return { success: true, skipped: true }

  try {
    const currentTransfer = await stripe.transfers.retrieve(transferId)
    const remainingAmount = currentTransfer.amount - currentTransfer.amount_reversed

    if (remainingAmount <= 0 || currentTransfer.reversed) {
      const knownReversalId = existingReversalId ?? currentTransfer.reversals.data.at(0)?.id ?? null
      await db
        .update(payment)
        .set({
          transferReversalId: knownReversalId,
          transferStatus: 'reversed',
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId))
      await db
        .update(paymentTransfer)
        .set({
          stripeTransferReversalId: knownReversalId,
          reversedAmount: currentTransfer.amount_reversed,
          status: 'reversed',
          purpose,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransfer.stripeTransferId, transferId))
      await clearRecoveredTransferReversalReview(paymentId)
      return { success: true, skipped: true, reason: 'already_reversed' }
    }

    const reversal = await stripe.transfers.createReversal(
      transferId,
      {
        amount: remainingAmount,
        metadata: { discunoPaymentId: paymentId.toString(), discunoPurpose: purpose },
      },
      { idempotencyKey: `discuno:transfer-reversal:v2:${transferId}` }
    )

    const reversalAudit = {
      lastTransferReversal: {
        transferId,
        reversalId: reversal.id,
        purpose,
        reversedAt: new Date().toISOString(),
      },
    }

    await db
      .update(payment)
      .set({
        transferReversalId: reversal.id,
        transferStatus: 'reversed',
        metadata: sql`coalesce(${payment.metadata}, '{}'::jsonb) || ${JSON.stringify(reversalAudit)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))

    await db
      .update(paymentTransfer)
      .set({
        stripeTransferReversalId: reversal.id,
        reversedAmount: currentTransfer.amount_reversed + reversal.amount,
        status: 'reversed',
        purpose,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransfer.stripeTransferId, transferId))

    await clearRecoveredTransferReversalReview(paymentId)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transfer reversal error'
    await db
      .update(payment)
      .set({
        requiresManualReview: true,
        reviewReason: `Transfer reversal failed: ${message}`.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
    await sendAdminAlert({
      type: 'MENTOR_TRANSFER_REVERSAL_FAILED',
      paymentId,
      error: message,
    })
    return { success: false, error: message }
  }
}

const refundPaymentUnlocked = async (
  paymentId: number,
  purpose: string
): Promise<PaymentOperationResult & { refundStatus?: string }> => {
  let record = await db.query.payment.findFirst({ where: eq(payment.id, paymentId) })
  if (!record) return { success: false, error: 'Payment not found' }

  // Stripe only guarantees idempotency keys for a limited retention window. Reconcile
  // any existing refund before creating another one so an ambiguous old request cannot
  // become a duplicate refund when this workflow is retried days later.
  const existingRefunds = await stripe.refunds.list({
    payment_intent: record.stripePaymentIntentId,
    limit: 100,
  })

  const latestStripeRefund = existingRefunds.data[0]
  if (latestStripeRefund) {
    await syncStripeRefundUnlocked(latestStripeRefund)
    const reconciledRecord = await db.query.payment.findFirst({
      where: eq(payment.id, paymentId),
    })
    if (!reconciledRecord) return { success: false, error: 'Payment not found after refund sync' }
    record = reconciledRecord
  }

  if (record.refundStatus === 'succeeded' && (record.refundedAmount ?? 0) >= record.amount) {
    const reversal = await reverseMentorTransfer({
      paymentId,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose,
    })
    return { ...reversal, refundStatus: record.refundStatus }
  }

  if (record.refundStatus === 'succeeded') {
    return {
      success: false,
      skipped: true,
      refundStatus: record.refundStatus,
      error: 'The Stripe payment is only partially refunded and requires manual review',
    }
  }

  if (record.refundStatus === 'pending' || record.refundStatus === 'requires_action') {
    const reversal = await reverseMentorTransfer({
      paymentId,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose,
    })
    const requiresAction = record.refundStatus === 'requires_action'
    return {
      success: requiresAction ? false : reversal.success,
      skipped: true,
      refundStatus: record.refundStatus,
      reason: requiresAction ? 'refund_requires_action' : 'refund_in_progress',
      ...(requiresAction
        ? {
            error: reversal.error ?? 'The Stripe refund requires customer action and manual review',
          }
        : !reversal.success
          ? { error: reversal.error }
          : {}),
    }
  }

  if (
    record.stripeRefundId &&
    (record.refundStatus === 'failed' || record.refundStatus === 'canceled')
  ) {
    return {
      success: false,
      skipped: true,
      refundStatus: record.refundStatus,
      error: `Existing Stripe refund ${record.stripeRefundId} ${record.refundStatus}`,
    }
  }

  const result = await refundStripePaymentIntent(record.stripePaymentIntentId, {
    purpose,
    idempotencyKey: `discuno:payment-refund:v1:${paymentId}`,
  })

  if (!result.success || !result.status) {
    let discoveredRefund: Stripe.Refund | undefined
    try {
      const refundsAfterFailure = await stripe.refunds.list({
        payment_intent: record.stripePaymentIntentId,
        limit: 100,
      })
      discoveredRefund = refundsAfterFailure.data[0]
    } catch (reconciliationError) {
      console.error('Could not reconcile Stripe after an ambiguous refund failure', {
        paymentId,
        error:
          reconciliationError instanceof Error
            ? reconciliationError.message
            : 'Unknown Stripe reconciliation error',
      })
    }

    if (discoveredRefund) {
      await syncStripeRefundUnlocked(discoveredRefund)
      const reconciledRecord = await db.query.payment.findFirst({
        where: eq(payment.id, paymentId),
      })
      if (
        reconciledRecord?.refundStatus === 'succeeded' &&
        (reconciledRecord.refundedAmount ?? 0) >= reconciledRecord.amount
      ) {
        return { success: true, refundStatus: 'succeeded', reason: 'stripe_reconciled' }
      }
      if (reconciledRecord?.refundStatus === 'pending') {
        return {
          success: true,
          skipped: true,
          refundStatus: 'pending',
          reason: 'refund_in_progress',
        }
      }
      if (reconciledRecord?.refundStatus === 'requires_action') {
        return {
          success: false,
          skipped: true,
          refundStatus: 'requires_action',
          error: 'The Stripe refund requires customer action and manual review',
        }
      }
      if (reconciledRecord?.refundStatus === 'succeeded') {
        return {
          success: false,
          skipped: true,
          refundStatus: 'succeeded',
          error: 'The Stripe payment is only partially refunded and requires manual review',
        }
      }
    }

    if (result.refundId && result.status && result.amount !== undefined) {
      await persistRefundSnapshot({
        paymentId,
        refundId: result.refundId,
        amount: result.amount,
        currency: record.currency,
        status: result.status,
        purpose,
      })
    }
    const storedDisputeState = await getStoredDisputeState(paymentId)
    const hasIndependentFailureReview =
      record.requiresManualReview &&
      !record.reviewReason?.startsWith('Stripe refund') &&
      !record.reviewReason?.startsWith('Transfer reversal failed')
    await db
      .update(payment)
      .set({
        platformStatus: storedDisputeState === 'active' ? 'DISPUTED' : 'FAILED',
        refundStatus: result.status ?? 'failed',
        stripeRefundId: result.refundId,
        refundedAmount: result.amount,
        requiresManualReview: true,
        reviewReason: hasIndependentFailureReview
          ? record.reviewReason
          : `Automatic refund failed: ${result.error ?? result.status ?? 'unknown error'}`.slice(
              0,
              500
            ),
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
    await sendAdminAlert({
      type: 'AUTOMATIC_REFUND_FAILED',
      paymentId,
      error: result.error ?? 'Stripe did not accept the refund',
    })
    return { success: false, refundStatus: result.status, error: result.error }
  }

  if (result.refundId && result.amount !== undefined) {
    await persistRefundSnapshot({
      paymentId,
      refundId: result.refundId,
      amount: result.amount,
      currency: record.currency,
      status: result.status,
      purpose,
    })
  }

  const storedDisputeState = await getStoredDisputeState(paymentId)
  const refundPlatformStatus = getPlatformStatusForRefund(result.status)
  const platformStatus =
    storedDisputeState === 'active'
      ? 'DISPUTED'
      : storedDisputeState === 'lost'
        ? 'FAILED'
        : refundPlatformStatus
  const hasTransferReversalReview =
    record.requiresManualReview && record.reviewReason?.startsWith('Transfer reversal failed')
  const hasIndependentReview =
    record.requiresManualReview &&
    !record.reviewReason?.startsWith('Stripe refund') &&
    !record.reviewReason?.startsWith('Transfer reversal failed') &&
    !record.reviewReason?.startsWith('Cancellation actor unresolved:')
  const requiresRefundReview = result.status === 'requires_action'
  await db
    .update(payment)
    .set({
      platformStatus,
      stripeRefundId: result.refundId,
      refundStatus: result.status,
      refundedAmount: result.amount,
      refundedAt: result.status === 'succeeded' ? new Date() : null,
      requiresManualReview:
        requiresRefundReview || hasIndependentReview || hasTransferReversalReview,
      reviewReason: hasIndependentReview
        ? record.reviewReason
        : requiresRefundReview
          ? 'Stripe refund requires customer action'
          : hasTransferReversalReview
            ? record.reviewReason
            : null,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentId))

  if (result.status === 'succeeded') {
    await sendRefundNotificationOnce({
      paymentId,
      customerEmail: record.customerEmail,
      amount: result.amount ?? record.amount,
      reason: purpose.replaceAll('_', ' '),
    })
  }

  const reversal = shouldReverseMentorTransferForRefundStatus(result.status)
    ? await reverseMentorTransfer({
        paymentId,
        transferId: record.transferId,
        existingReversalId: record.transferReversalId,
        purpose,
      })
    : { success: false, error: 'Stripe refund requires customer action' }

  return {
    success: result.status === 'requires_action' ? false : reversal.success,
    refundStatus: result.status,
    ...(result.status === 'requires_action'
      ? { error: reversal.error ?? 'Stripe refund requires customer action' }
      : !reversal.success
        ? { error: reversal.error }
        : {}),
  }
}

export const refundPayment = async (
  paymentId: number,
  purpose: string
): Promise<PaymentOperationResult & { refundStatus?: string }> =>
  withPaymentOperationLock(paymentId, () => refundPaymentUnlocked(paymentId, purpose))

export const refundBookingPayment = async (
  calcomBookingUid: string,
  purpose: string
): Promise<PaymentOperationResult & { refundStatus?: string }> => {
  const [record] = await db
    .select({ paymentId: booking.paymentId })
    .from(booking)
    .where(eq(booking.calcomUid, calcomBookingUid))
    .limit(1)

  if (!record?.paymentId) return { success: true, skipped: true }
  return refundPayment(record.paymentId, purpose)
}

/**
 * Durably block payout when a cancellation cannot be classified safely.
 * The conditional update makes repeated webhook deliveries alert an operator once.
 */
export const holdBookingPaymentForManualReview = async (
  calcomBookingUid: string,
  reason: string
): Promise<PaymentOperationResult> => {
  const [record] = await db
    .select({
      paymentId: payment.id,
      platformStatus: payment.platformStatus,
    })
    .from(booking)
    .innerJoin(payment, eq(payment.id, booking.paymentId))
    .where(eq(booking.calcomUid, calcomBookingUid))
    .limit(1)

  if (!record) return { success: true, skipped: true, reason: 'unpaid_booking' }
  if (record.platformStatus === 'REFUNDED') {
    return { success: true, skipped: true, reason: 'already_refunded' }
  }

  const reviewReason = `Cancellation actor unresolved: ${reason}`.slice(0, 500)
  const [held] = await db
    .update(payment)
    .set({ requiresManualReview: true, reviewReason, updatedAt: new Date() })
    .where(
      and(
        eq(payment.id, record.paymentId),
        eq(payment.requiresManualReview, false),
        ne(payment.platformStatus, 'REFUNDED')
      )
    )
    .returning({ id: payment.id })

  if (held) {
    await sendAdminAlert({
      type: 'CANCELLATION_ACTOR_REQUIRES_REVIEW',
      paymentId: record.paymentId,
      error: reviewReason,
    })
  }

  return {
    success: true,
    skipped: !held,
    reason: held ? 'manual_review' : 'manual_review_existing',
  }
}

const transferMentorPaymentUnlocked = async ({
  paymentId,
  calcomBookingUid,
}: {
  paymentId: number
  calcomBookingUid: string
}): Promise<PaymentOperationResult & { transferId?: string }> => {
  const [record] = await db
    .select({
      paymentId: payment.id,
      paymentIntentId: payment.stripePaymentIntentId,
      platformStatus: payment.platformStatus,
      currency: payment.currency,
      mentorAmount: payment.mentorAmount,
      mentorStripeAccountId: payment.mentorStripeAccountId,
      transferGroup: payment.transferGroup,
      transferId: payment.transferId,
      transferStatus: payment.transferStatus,
      transferGeneration: payment.transferGeneration,
      transferReversalId: payment.transferReversalId,
      disputeRequested: payment.disputeRequested,
      disputePeriodEnds: payment.disputePeriodEnds,
      bookingStatus: booking.status,
      bookingEndTime: booking.endTime,
      hostNoShow: booking.hostNoShow,
      attendeeNoShow: booking.attendeeNoShow,
      mentorPayoutEligible: booking.mentorPayoutEligible,
      mentorEmail: user.email,
      requiresManualReview: payment.requiresManualReview,
      reviewReason: payment.reviewReason,
    })
    .from(payment)
    .innerJoin(booking, eq(booking.paymentId, payment.id))
    .innerJoin(
      bookingOrganizer,
      and(
        eq(bookingOrganizer.bookingId, booking.id),
        eq(bookingOrganizer.userId, payment.mentorUserId)
      )
    )
    .innerJoin(user, eq(user.id, payment.mentorUserId))
    .where(and(eq(payment.id, paymentId), eq(booking.calcomUid, calcomBookingUid)))
    .limit(1)

  if (!record) return { success: false, error: 'Payment booking not found' }
  if (
    record.platformStatus === 'TRANSFERRED' &&
    record.transferId &&
    record.transferStatus === 'created'
  ) {
    return {
      success: true,
      skipped: true,
      transferId: record.transferId,
      reason: 'already_transferred',
    }
  }
  if (record.requiresManualReview && record.reviewReason?.startsWith('Transfer reversal failed')) {
    const reversal = await reverseMentorTransfer({
      paymentId,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose: 'reversal_retry',
    })
    if (!reversal.success) {
      throw new Error(reversal.error ?? 'Transfer reversal retry failed')
    }
    return { success: true, skipped: true, reason: 'transfer_reversal_recovered' }
  }
  if (record.requiresManualReview) {
    return { success: true, skipped: true, reason: 'manual_review' }
  }
  if (record.platformStatus !== 'SUCCEEDED' || record.disputeRequested) {
    return { success: true, skipped: true, reason: 'payment_held' }
  }

  const serviceDelivered = isMentorPayoutEligibleBooking({
    status: record.bookingStatus,
    endTime: record.bookingEndTime,
    hostNoShow: record.hostNoShow,
    attendeeNoShow: record.attendeeNoShow,
    mentorPayoutEligible: record.mentorPayoutEligible,
  })
  if (!serviceDelivered) {
    return { success: true, skipped: true, reason: 'service_not_delivered' }
  }

  const eligibleAt = new Date(
    Math.max(
      record.disputePeriodEnds.getTime(),
      record.bookingEndTime.getTime() + MENTOR_PAYOUT_DELAY_HOURS * 60 * 60 * 1000
    )
  )
  if (eligibleAt.getTime() > Date.now()) {
    return {
      success: true,
      skipped: true,
      reason: 'payout_not_due',
      nextAttemptAt: eligibleAt.toISOString(),
    }
  }
  if (!record.mentorStripeAccountId) {
    return { success: false, error: 'Mentor Stripe account is missing' }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(record.paymentIntentId)
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment intent is ${paymentIntent.status}, not succeeded`)
    }
    let chargeId = getExpandableId(paymentIntent.latest_charge)
    if (!chargeId) {
      const charges = await stripe.charges.list({
        payment_intent: record.paymentIntentId,
        limit: 1,
      })
      chargeId = charges.data[0]?.id ?? null
    }
    if (!chargeId) throw new Error('Stripe charge was not found for mentor transfer')

    const charge = await stripe.charges.retrieve(chargeId)
    if (!charge.paid || charge.status !== 'succeeded') {
      throw new Error(`Stripe charge ${chargeId} is ${charge.status}, not succeeded`)
    }

    // A missed or delayed dispute webhook must never allow a payout. Stripe's
    // current dispute collection is authoritative; closed won/prevented disputes
    // are safe, while active or lost disputes remain hard holds.
    const stripeDisputes = await stripe.disputes.list({
      payment_intent: record.paymentIntentId,
      limit: 100,
    })
    for (const stripeDispute of stripeDisputes.data) {
      await syncStripeDisputeUnlocked(stripeDispute)
    }
    const storedDisputeState = await getStoredDisputeState(paymentId)
    if (stripeDisputes.has_more) {
      const reason = 'Stripe dispute reconciliation exceeded the 100-object safety limit'
      await db
        .update(payment)
        .set({
          requiresManualReview: true,
          reviewReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId))
      await sendAdminAlert({
        type: 'DISPUTE_RECONCILIATION_LIMIT_EXCEEDED',
        paymentId,
        error: reason,
      })
      return { success: true, skipped: true, reason: 'manual_review' }
    }
    if (storedDisputeState === 'active' || storedDisputeState === 'lost') {
      return {
        success: true,
        skipped: true,
        reason: storedDisputeState === 'active' ? 'charge_disputed' : 'dispute_lost',
      }
    }
    if (charge.disputed && stripeDisputes.data.length === 0) {
      const reason = `Stripe reports charge ${chargeId} as disputed without a retrievable dispute`
      await db
        .update(payment)
        .set({
          platformStatus: 'DISPUTED',
          requiresManualReview: true,
          reviewReason: `Stripe dispute reconciliation failed for charge ${chargeId}`,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId))
      await sendAdminAlert({ type: 'STRIPE_DISPUTE_PAYOUT_BLOCKED', paymentId, error: reason })
      return { success: true, skipped: true, reason: 'charge_disputed' }
    }

    const stripeReviewId = getExpandableId(charge.review)
    if (stripeReviewId) {
      const stripeReview = await stripe.reviews.retrieve(stripeReviewId)
      if (stripeReview.open) {
        return { success: true, skipped: true, reason: 'stripe_review_open' }
      }
    }

    if (charge.refunded || charge.amount_refunded > 0) {
      await db
        .update(payment)
        .set({
          platformStatus: charge.refunded ? 'REFUNDED' : 'PROCESSING',
          refundedAmount: charge.amount_refunded,
          requiresManualReview: !charge.refunded,
          reviewReason: charge.refunded ? null : `Stripe charge ${chargeId} has a partial refund`,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId))
      await sendAdminAlert({
        type: 'REFUNDED_CHARGE_PAYOUT_BLOCKED',
        paymentId,
        error: `Stripe charge ${chargeId} has refunded funds and cannot be paid out automatically`,
      })
      return { success: true, skipped: true, reason: 'charge_refunded' }
    }

    const transferGeneration =
      record.transferStatus === 'reversed'
        ? record.transferGeneration + 1
        : record.transferGeneration
    if (!record.transferGroup) {
      const reason = 'Payment is missing the Stripe transfer group required for reconciliation'
      await db
        .update(payment)
        .set({ requiresManualReview: true, reviewReason: reason, updatedAt: new Date() })
        .where(eq(payment.id, paymentId))
      await sendAdminAlert({
        type: 'TRANSFER_RECONCILIATION_MISSING_GROUP',
        paymentId,
        error: reason,
      })
      return { success: true, skipped: true, reason: 'manual_review' }
    }

    const existingTransfers = await stripe.transfers.list({
      transfer_group: record.transferGroup,
      limit: 100,
    })
    const activeGroupTransfers = existingTransfers.data.filter(
      candidate => !candidate.reversed && candidate.amount_reversed < candidate.amount
    )
    const transferWithGeneration = activeGroupTransfers.map(candidate => {
      const destination = getExpandableId(candidate.destination)
      const sourceTransaction = getExpandableId(candidate.source_transaction)
      const rawGeneration = candidate.metadata.discunoTransferGeneration
      const parsedGeneration =
        rawGeneration && /^\d+$/.test(rawGeneration) ? Number(rawGeneration) : null
      return {
        transfer: candidate,
        matchesPayment:
          candidate.metadata.discunoPaymentId === paymentId.toString() &&
          candidate.amount === record.mentorAmount &&
          candidate.currency === record.currency.toLowerCase() &&
          destination === record.mentorStripeAccountId &&
          sourceTransaction === chargeId,
        generation:
          parsedGeneration !== null &&
          Number.isSafeInteger(parsedGeneration) &&
          parsedGeneration >= 0 &&
          parsedGeneration <= 2_147_483_647
            ? parsedGeneration
            : null,
      }
    })
    const exactTransfers = transferWithGeneration.filter(
      candidate =>
        candidate.matchesPayment &&
        candidate.transfer.amount_reversed === 0 &&
        (candidate.generation === transferGeneration ||
          (candidate.generation === null && transferGeneration === 0))
    )

    if (
      existingTransfers.has_more ||
      activeGroupTransfers.length > 1 ||
      (activeGroupTransfers.length === 1 && exactTransfers.length !== 1)
    ) {
      const reason = `Stripe transfer reconciliation conflict for generation ${transferGeneration}`
      await db
        .update(payment)
        .set({ requiresManualReview: true, reviewReason: reason, updatedAt: new Date() })
        .where(eq(payment.id, paymentId))
      await sendAdminAlert({ type: 'TRANSFER_RECONCILIATION_CONFLICT', paymentId, error: reason })
      return { success: true, skipped: true, reason: 'manual_review' }
    }

    const existingTransferMatch = exactTransfers[0]
    const existingTransfer = existingTransferMatch?.transfer
    if (existingTransfer) {
      const reconciledGeneration = existingTransferMatch.generation ?? transferGeneration
      await persistTransferSnapshot({
        paymentId,
        transfer: existingTransfer,
        generation: reconciledGeneration,
        status: 'created',
      })
      await db
        .update(payment)
        .set({
          platformStatus: 'TRANSFERRED',
          stripeChargeId: chargeId,
          transferId: existingTransfer.id,
          transferStatus: 'created',
          transferGeneration: reconciledGeneration,
          transferReversalId: null,
          requiresManualReview: false,
          reviewReason: null,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId))
      return { success: true, transferId: existingTransfer.id, reason: 'stripe_reconciled' }
    }

    const transfer = await stripe.transfers.create(
      {
        amount: record.mentorAmount,
        currency: record.currency.toLowerCase(),
        destination: record.mentorStripeAccountId,
        source_transaction: chargeId,
        transfer_group: record.transferGroup,
        metadata: {
          discunoPaymentId: paymentId.toString(),
          calcomBookingUid,
          discunoTransferGeneration: transferGeneration.toString(),
        },
      },
      {
        idempotencyKey: `discuno:mentor-transfer:v2:${paymentId}:${transferGeneration}`,
      }
    )

    await persistTransferSnapshot({
      paymentId,
      transfer,
      generation: transferGeneration,
      status: 'created',
    })

    await db
      .update(payment)
      .set({
        platformStatus: 'TRANSFERRED',
        stripeChargeId: chargeId,
        transferId: transfer.id,
        transferStatus: 'created',
        transferGeneration,
        transferReversalId: null,
        requiresManualReview: false,
        reviewReason: null,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))

    if (record.mentorEmail) {
      await sendPayoutNotificationEmail({
        mentorEmail: record.mentorEmail,
        amount: record.mentorAmount,
        currency: record.currency,
        transferId: transfer.id,
      })
    }

    return { success: true, transferId: transfer.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mentor transfer error'
    await db
      .update(payment)
      .set({
        transferStatus: 'failed',
        transferRetryCount: sql`${payment.transferRetryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
    throw new Error(message)
  }
}

export const transferMentorPayment = async (input: {
  paymentId: number
  calcomBookingUid: string
}): Promise<PaymentOperationResult & { transferId?: string }> =>
  withPaymentOperationLock(input.paymentId, () => transferMentorPaymentUnlocked(input))

/** Reconcile a delayed or post-fulfillment Stripe payment failure safely. */
export const syncStripePaymentFailure = async (
  paymentIntentId: string,
  sourceEvent: string
): Promise<boolean> => {
  const existingPayment = await db.query.payment.findFirst({
    where: eq(payment.stripePaymentIntentId, paymentIntentId),
    columns: { id: true },
  })
  if (!existingPayment) return false

  return withPaymentOperationLock(existingPayment.id, async () => {
    // Failure events can be delivered after a later successful retry. Stripe's
    // current intent is authoritative, so never unwind a payment that now succeeded.
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (paymentIntent.status === 'succeeded') {
      const recoveredPayment = await db.query.payment.findFirst({
        where: eq(payment.id, existingPayment.id),
      })
      if (
        recoveredPayment?.platformStatus === 'FAILED' &&
        recoveredPayment.reviewReason?.startsWith('Stripe payment failure')
      ) {
        await db
          .update(payment)
          .set({
            platformStatus:
              recoveredPayment.transferId && recoveredPayment.transferStatus === 'created'
                ? 'TRANSFERRED'
                : 'SUCCEEDED',
            requiresManualReview: false,
            reviewReason: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payment.id, existingPayment.id),
              eq(payment.platformStatus, 'FAILED'),
              like(payment.reviewReason, 'Stripe payment failure%')
            )
          )
      }
      return true
    }

    const record = await db.query.payment.findFirst({
      where: eq(payment.id, existingPayment.id),
    })
    if (!record) return false

    const reason = `Stripe payment failure (${sourceEvent}): intent is ${paymentIntent.status}`
    await db
      .update(payment)
      .set({
        platformStatus: 'FAILED',
        requiresManualReview: true,
        reviewReason: reason.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(payment.id, record.id))

    const reversal = await reverseMentorTransfer({
      paymentId: record.id,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose: 'payment_failed',
    })
    if (!reversal.success) {
      throw new Error(reversal.error ?? `Could not reverse failed payment ${record.id}`)
    }

    await sendAdminAlert({
      type: 'STRIPE_PAYMENT_FAILED_AFTER_CHECKOUT',
      paymentId: record.id,
      error: reason,
    })
    return true
  })
}

export const resolveDisputePaymentIntentId = async (
  dispute: Stripe.Dispute
): Promise<string | null> => {
  const directId = getExpandableId(dispute.payment_intent)
  if (directId) return directId

  const charge =
    typeof dispute.charge === 'string'
      ? await stripe.charges.retrieve(dispute.charge)
      : dispute.charge
  return getExpandableId(charge.payment_intent)
}

const syncStripeDisputeUnlocked = async (dispute: Stripe.Dispute): Promise<boolean> => {
  const paymentIntentId = await resolveDisputePaymentIntentId(dispute)
  if (!paymentIntentId) return false

  const record = await db.query.payment.findFirst({
    where: eq(payment.stripePaymentIntentId, paymentIntentId),
  })
  if (!record) return false

  const disputeState = getReconciledDisputeState(dispute.status)
  await db
    .insert(paymentDispute)
    .values({
      paymentId: record.id,
      stripeDisputeId: dispute.id,
      status: dispute.status,
      state: disputeState,
      amount: dispute.amount,
      currency: dispute.currency.toUpperCase(),
      reason: dispute.reason,
      evidenceDueBy: dispute.evidence_details.due_by
        ? new Date(dispute.evidence_details.due_by * 1000)
        : null,
      metadata: { networkReasonCode: dispute.network_reason_code ?? null },
    })
    .onConflictDoUpdate({
      target: paymentDispute.stripeDisputeId,
      set: {
        status: dispute.status,
        state: disputeState,
        amount: dispute.amount,
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_details.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : null,
        metadata: { networkReasonCode: dispute.network_reason_code ?? null },
        updatedAt: new Date(),
      },
    })

  const effectiveDisputeState = await getStoredDisputeState(record.id)
  const restoredPlatformStatus =
    record.refundStatus === 'succeeded'
      ? (record.refundedAmount ?? 0) >= record.amount
        ? 'REFUNDED'
        : 'PROCESSING'
      : record.refundStatus === 'pending' || record.refundStatus === 'requires_action'
        ? 'PROCESSING'
        : record.refundStatus === 'failed' || record.refundStatus === 'canceled'
          ? 'FAILED'
          : record.transferId && record.transferStatus === 'created'
            ? 'TRANSFERRED'
            : 'SUCCEEDED'
  const platformStatus =
    effectiveDisputeState === 'active'
      ? 'DISPUTED'
      : effectiveDisputeState === 'lost'
        ? 'FAILED'
        : restoredPlatformStatus
  const hasIndependentReview =
    record.requiresManualReview &&
    !record.reviewReason?.startsWith('Stripe dispute') &&
    !record.reviewReason?.startsWith('Transfer reversal failed')

  const disputeAudit = {
    stripeDispute: {
      id: dispute.id,
      status: dispute.status,
      reason: dispute.reason,
      amount: dispute.amount,
      currency: dispute.currency,
      dueBy: dispute.evidence_details.due_by,
      syncedAt: new Date().toISOString(),
    },
  }

  await db
    .update(payment)
    .set({
      platformStatus,
      requiresManualReview: effectiveDisputeState !== 'released' || hasIndependentReview,
      reviewReason:
        effectiveDisputeState === 'active'
          ? hasIndependentReview
            ? record.reviewReason
            : `Stripe dispute ${dispute.id} requires response`
          : effectiveDisputeState === 'lost'
            ? hasIndependentReview
              ? record.reviewReason
              : `Stripe dispute ${dispute.id} was lost`
            : hasIndependentReview
              ? record.reviewReason
              : null,
      metadata: sql`coalesce(${payment.metadata}, '{}'::jsonb) || ${JSON.stringify(disputeAudit)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, record.id))

  if (effectiveDisputeState === 'active' || effectiveDisputeState === 'lost') {
    const reversal = await reverseMentorTransfer({
      paymentId: record.id,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose: `dispute_${dispute.id}`,
    })
    if (!reversal.success) {
      throw new Error(reversal.error ?? `Could not reverse transfer for dispute ${dispute.id}`)
    }
  }

  if (disputeState !== 'released') {
    await sendAdminAlert({
      type: disputeState === 'lost' ? 'STRIPE_DISPUTE_LOST' : 'STRIPE_DISPUTE_OPENED',
      paymentId: record.id,
      error: `Review Stripe dispute ${dispute.id} (${dispute.status})`,
    })
  }

  if (
    effectiveDisputeState === 'released' &&
    platformStatus === 'SUCCEEDED' &&
    !record.disputeRequested &&
    (!record.transferId ||
      record.transferStatus === 'reversed' ||
      record.transferStatus === 'failed')
  ) {
    const [activeBooking] = await db
      .select({ calcomUid: booking.calcomUid })
      .from(booking)
      .where(
        and(
          eq(booking.paymentId, record.id),
          or(ne(booking.status, 'CANCELLED'), eq(booking.mentorPayoutEligible, true))
        )
      )
      .orderBy(desc(booking.startTime))
      .limit(1)

    if (activeBooking) {
      await scheduleMentorPayout({
        paymentId: record.id,
        calcomBookingUid: activeBooking.calcomUid,
        payoutEligibleAt: record.disputePeriodEnds,
        reason: `dispute-released-${dispute.id}`,
      })
    }
  }

  return true
}

export const syncStripeDispute = async (dispute: Stripe.Dispute): Promise<boolean> => {
  const paymentIntentId = await resolveDisputePaymentIntentId(dispute)
  if (!paymentIntentId) return false

  const record = await db.query.payment.findFirst({
    where: eq(payment.stripePaymentIntentId, paymentIntentId),
    columns: { id: true },
  })
  if (!record) return false

  return withPaymentOperationLock(record.id, () => syncStripeDisputeUnlocked(dispute))
}

const syncStripeRefundUnlocked = async (refund: Stripe.Refund): Promise<boolean> => {
  const paymentIntentId = getExpandableId(refund.payment_intent)
  if (!paymentIntentId) return false

  const record = await db.query.payment.findFirst({
    where: eq(payment.stripePaymentIntentId, paymentIntentId),
  })
  if (!record) return false

  // Refund events are unordered and one charge can have multiple partial or failed
  // refunds. Rebuild the aggregate from Stripe instead of letting the last-delivered
  // event overwrite a newer pending or successful refund.
  const listedRefunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })
  const refundsById = new Map(
    [...listedRefunds.data, refund].map(stripeRefund => [stripeRefund.id, stripeRefund])
  )
  const stripeRefunds = [...refundsById.values()]
  const refundsWithStatus = stripeRefunds.map(stripeRefund => ({
    refund: stripeRefund,
    status: normalizeStripeRefundStatus(stripeRefund.status),
  }))
  const requiresActionRefund = refundsWithStatus.find(item => item.status === 'requires_action')
  const pendingRefund = refundsWithStatus.find(item => item.status === 'pending')
  const succeededRefund = refundsWithStatus.find(item => item.status === 'succeeded')
  const failedRefund = refundsWithStatus.find(item => item.status === 'failed')
  const canceledRefund = refundsWithStatus.find(item => item.status === 'canceled')

  for (const item of refundsWithStatus) {
    await persistRefundSnapshot({
      paymentId: record.id,
      refundId: item.refund.id,
      amount: item.refund.amount,
      currency: item.refund.currency,
      status: item.status,
      purpose: item.refund.metadata?.discunoPurpose,
      metadata: item.refund.metadata ?? {},
    })
  }

  let chargeId = getExpandableId(refund.charge) ?? getExpandableId(stripeRefunds[0]?.charge)
  if (!chargeId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    chargeId = getExpandableId(paymentIntent.latest_charge)
  }
  const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null
  const totalRefunded =
    charge?.amount_refunded ??
    refundsWithStatus.reduce(
      (total, item) => total + (item.status === 'succeeded' ? item.refund.amount : 0),
      0
    )
  const isFullRefund = totalRefunded >= record.amount
  const reconciledRefundStatus = isFullRefund
    ? 'succeeded'
    : requiresActionRefund
      ? 'requires_action'
      : pendingRefund
        ? 'pending'
        : totalRefunded > 0
          ? 'succeeded'
          : failedRefund
            ? 'failed'
            : canceledRefund
              ? 'canceled'
              : normalizeStripeRefundStatus(refund.status)
  const primaryRefund = isFullRefund
    ? (succeededRefund?.refund ?? refund)
    : (requiresActionRefund?.refund ??
      pendingRefund?.refund ??
      succeededRefund?.refund ??
      failedRefund?.refund ??
      canceledRefund?.refund ??
      refund)

  const refundPlatformStatus =
    reconciledRefundStatus === 'succeeded'
      ? isFullRefund
        ? 'REFUNDED'
        : 'PROCESSING'
      : reconciledRefundStatus === 'pending' || reconciledRefundStatus === 'requires_action'
        ? 'PROCESSING'
        : totalRefunded > 0
          ? 'PROCESSING'
          : getPlatformStatusForRefund(reconciledRefundStatus)
  const storedDisputeState = await getStoredDisputeState(record.id)
  const platformStatus =
    storedDisputeState === 'active'
      ? 'DISPUTED'
      : storedDisputeState === 'lost'
        ? 'FAILED'
        : refundPlatformStatus

  const requiresRefundReview =
    listedRefunds.has_more ||
    (reconciledRefundStatus === 'succeeded' && !isFullRefund) ||
    reconciledRefundStatus === 'requires_action' ||
    reconciledRefundStatus === 'failed' ||
    reconciledRefundStatus === 'canceled'
  const hasTransferReversalReview =
    record.requiresManualReview && record.reviewReason?.startsWith('Transfer reversal failed')
  const hasIndependentReview =
    record.requiresManualReview &&
    !record.reviewReason?.startsWith('Stripe refund') &&
    !record.reviewReason?.startsWith('Transfer reversal failed') &&
    !record.reviewReason?.startsWith('Cancellation actor unresolved:')

  await db
    .update(payment)
    .set({
      platformStatus,
      stripeRefundId: primaryRefund.id,
      refundStatus: reconciledRefundStatus,
      refundedAmount: totalRefunded,
      refundedAt: isFullRefund ? (record.refundedAt ?? new Date()) : null,
      requiresManualReview:
        requiresRefundReview || hasIndependentReview || hasTransferReversalReview,
      reviewReason: listedRefunds.has_more
        ? hasIndependentReview
          ? record.reviewReason
          : 'Stripe refund reconciliation exceeded the 100-object safety limit'
        : hasIndependentReview
          ? record.reviewReason
          : requiresRefundReview
            ? `Stripe refund ${primaryRefund.id} is ${reconciledRefundStatus}${
                reconciledRefundStatus === 'succeeded' && !isFullRefund ? ' and partial' : ''
              }`
            : hasTransferReversalReview
              ? record.reviewReason
              : null,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, record.id))

  if (totalRefunded > 0 || pendingRefund || requiresActionRefund) {
    const reversal = await reverseMentorTransfer({
      paymentId: record.id,
      transferId: record.transferId,
      existingReversalId: record.transferReversalId,
      purpose: `refund_${primaryRefund.id}`,
    })
    if (!reversal.success) {
      throw new Error(reversal.error ?? `Could not reverse transfer for refund ${primaryRefund.id}`)
    }
  }

  if (listedRefunds.has_more) {
    await sendAdminAlert({
      type: 'REFUND_RECONCILIATION_LIMIT_EXCEEDED',
      paymentId: record.id,
      error: 'Stripe returned more than 100 refunds for one payment',
    })
  }

  if (reconciledRefundStatus === 'succeeded' && !isFullRefund) {
    await sendAdminAlert({
      type: 'PARTIAL_REFUND_REQUIRES_REVIEW',
      paymentId: record.id,
      error: `Stripe refund ${primaryRefund.id} is partial; mentor transfer remains blocked`,
    })
  }

  if (reconciledRefundStatus === 'succeeded' && isFullRefund) {
    await sendRefundNotificationOnce({
      paymentId: record.id,
      customerEmail: record.customerEmail,
      amount: totalRefunded,
      reason: primaryRefund.metadata?.discunoPurpose?.replaceAll('_', ' ') ?? 'booking refund',
    })
  }

  return true
}

export const syncStripeRefund = async (refund: Stripe.Refund): Promise<boolean> => {
  const paymentIntentId = getExpandableId(refund.payment_intent)
  if (!paymentIntentId) return false

  const record = await db.query.payment.findFirst({
    where: eq(payment.stripePaymentIntentId, paymentIntentId),
    columns: { id: true },
  })
  if (!record) return false

  return withPaymentOperationLock(record.id, () => syncStripeRefundUnlocked(refund))
}

export const updatePaymentPayoutEligibility = async (
  paymentId: number,
  startTime: Date | string,
  durationMinutes: number
) => {
  const eligibleAt = getMentorPayoutEligibleAt(startTime, durationMinutes)
  await db
    .update(payment)
    .set({ disputePeriodEnds: eligibleAt, updatedAt: new Date() })
    .where(eq(payment.id, paymentId))
  return eligibleAt
}
