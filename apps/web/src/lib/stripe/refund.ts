import { stripe } from '~/lib/stripe'

/**
 * Refund a Stripe payment intent
 */
export const refundStripePaymentIntent = async (
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      // refund full amount
      refund_application_fee: true,
      reverse_transfer: true,
    })

    console.log(`Successfully created refund ${refund.id} for payment intent ${paymentIntentId}`)
    return { success: true }
  } catch (error) {
    console.error(`Failed to refund payment intent ${paymentIntentId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown refund error',
    }
  }
}
