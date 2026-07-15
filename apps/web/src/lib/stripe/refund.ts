import { createHash } from 'node:crypto'
import { getSafeErrorName } from '~/lib/operational-logging'
import { stripe } from '~/lib/stripe'
import { normalizeStripeRefundStatus, type StripeRefundStatus } from '~/lib/stripe/marketplace'

/**
 * Refund a Stripe payment intent
 */
export const refundStripePaymentIntent = async (
  paymentIntentId: string,
  options: {
    purpose?: string
    idempotencyKey?: string
  } = {}
): Promise<{
  success: boolean
  refundId?: string
  status?: StripeRefundStatus
  amount?: number
  error?: string
}> => {
  const paymentReference = createHash('sha256').update(paymentIntentId).digest('hex').slice(0, 16)

  try {
    const purpose = options.purpose ?? 'booking_refund'
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: { discunoPurpose: purpose },
      },
      {
        idempotencyKey: options.idempotencyKey ?? `discuno:refund:v1:${purpose}:${paymentIntentId}`,
      }
    )

    const status = normalizeStripeRefundStatus(refund.status)
    const success = status !== 'failed' && status !== 'canceled'

    console.info('Stripe refund created', {
      paymentReference,
      status,
    })
    return {
      success,
      refundId: refund.id,
      status,
      amount: refund.amount,
      ...(!success && { error: `Stripe refund ${status}` }),
    }
  } catch (error) {
    console.error('Stripe refund request failed', {
      paymentReference,
      errorName: getSafeErrorName(error),
    })
    return {
      success: false,
      error: 'Stripe refund request failed',
    }
  }
}
