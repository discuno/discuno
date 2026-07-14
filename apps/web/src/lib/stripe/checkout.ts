import type Stripe from 'stripe'

export const isCheckoutSessionReadyForFulfillment = (
  paymentStatus: Stripe.Checkout.Session.PaymentStatus
): boolean => paymentStatus === 'paid' || paymentStatus === 'no_payment_required'

export const getCheckoutPaymentIntentId = (
  paymentIntent: string | Pick<Stripe.PaymentIntent, 'id'> | null
): string | null =>
  typeof paymentIntent === 'string' ? paymentIntent : (paymentIntent?.id ?? null)

export const getCheckoutFulfillmentEventId = (sessionId: string): string =>
  `stripe-checkout-${sessionId}`
