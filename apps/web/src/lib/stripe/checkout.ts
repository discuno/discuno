import type Stripe from 'stripe'

/**
 * Stripe does not cache parameter-validation failures under an idempotency key.
 * Only this exact response proves a stale Checkout request never began execution
 * and is therefore safe to replace with a new generation.
 */
export const isDefinitiveStripeCheckoutExpiryError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { type?: unknown; param?: unknown; statusCode?: unknown }
  return (
    candidate.type === 'StripeInvalidRequestError' &&
    candidate.param === 'expires_at' &&
    candidate.statusCode === 400
  )
}

export const isCheckoutSessionReadyForFulfillment = (
  paymentStatus: Stripe.Checkout.Session.PaymentStatus
): boolean => paymentStatus === 'paid' || paymentStatus === 'no_payment_required'

export const getCheckoutPaymentIntentId = (
  paymentIntent: string | Pick<Stripe.PaymentIntent, 'id'> | null
): string | null =>
  typeof paymentIntent === 'string' ? paymentIntent : (paymentIntent?.id ?? null)

export const getCheckoutFulfillmentEventId = (sessionId: string): string =>
  `stripe-checkout-${sessionId}`
