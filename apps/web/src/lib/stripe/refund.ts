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

    console.log(`Created refund ${refund.id} for payment intent ${paymentIntentId}`, {
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
    console.error(`Failed to refund payment intent ${paymentIntentId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown refund error',
    }
  }
}
