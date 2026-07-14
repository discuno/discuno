import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { handleCheckoutSessionWebhook } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { env } from '~/env'
import {
  syncStripeDispute,
  syncStripePaymentFailure,
  syncStripeRefund,
} from '~/lib/services/payment-service'
import { stripe } from '~/lib/stripe'

const getExpandableId = (value: string | { id: string } | null): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null)

export async function POST(req: Request) {
  const signature = (await headers()).get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ Webhook signature verification failed: ${errorMessage}`)
    return new Response('Invalid webhook signature', {
      status: 400,
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSessionSucceeded(event.data.object)
        break

      case 'refund.created':
      case 'refund.updated':
      case 'refund.failed': {
        // Event delivery is unordered; reconcile Stripe's current refund snapshot.
        const refund = await stripe.refunds.retrieve(event.data.object.id)
        const matched = await syncStripeRefund(refund)
        if (!matched) console.warn(`Stripe refund ${refund.id} has no Discuno payment`)
        break
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed': {
        // Stripe does not guarantee delivery order, so always reconcile the latest object.
        const dispute = await stripe.disputes.retrieve(event.data.object.id)
        const matched = await syncStripeDispute(dispute)
        if (!matched) console.warn(`Stripe dispute ${dispute.id} has no Discuno payment`)
        break
      }

      case 'checkout.session.async_payment_failed': {
        console.warn(`Stripe async Checkout payment failed: ${event.data.object.id}`)
        const paymentIntentId = getExpandableId(event.data.object.payment_intent)
        if (paymentIntentId) {
          const matched = await syncStripePaymentFailure(paymentIntentId, event.type)
          if (!matched) {
            console.info(`No fulfilled Discuno payment exists for failed ${paymentIntentId}`)
          }
        }
        break
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const matched = await syncStripePaymentFailure(event.data.object.id, event.type)
        if (!matched) {
          console.info(`No fulfilled Discuno payment exists for failed ${event.data.object.id}`)
        }
        break
      }

      case 'charge.failed': {
        const paymentIntentId = getExpandableId(event.data.object.payment_intent)
        if (paymentIntentId) {
          const matched = await syncStripePaymentFailure(paymentIntentId, event.type)
          if (!matched) {
            console.info(`No fulfilled Discuno payment exists for failed ${paymentIntentId}`)
          }
        }
        break
      }

      default:
        console.log(`🤷‍♀️ Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Webhook handler failed: ${errorMessage}`)
    return new Response('Webhook handler failed', {
      status: 500,
    })
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle successful checkout sessions
 */
async function handleCheckoutSessionSucceeded(checkoutSession: Stripe.Checkout.Session) {
  console.log(`Handling successful checkout session: ${checkoutSession.id}`)
  // checkout.session.completed is also emitted for delayed methods before funds
  // settle. Only the paid snapshot (including async_payment_succeeded) may create
  // a Discuno payment or Cal.com booking.
  if (checkoutSession.payment_status !== 'paid') {
    console.info(`Waiting for Checkout payment to settle: ${checkoutSession.id}`, {
      paymentStatus: checkoutSession.payment_status,
    })
    return
  }

  try {
    const response = await handleCheckoutSessionWebhook(checkoutSession)

    // Check if the response is 200 OK
    if (response.status === 200) {
      console.log(`✅ Successfully handled checkout session: ${checkoutSession.id}`)
    } else {
      // Response was not 200, log error and throw
      const errorText = await response.text()
      console.error(`❌ Failed to handle checkout session ${checkoutSession.id}: ${errorText}`)
      throw new Error(`Failed to handle checkout session ${checkoutSession.id}: ${errorText}`)
    }
  } catch (error) {
    console.error(`❌ Error handling checkout session ${checkoutSession.id}:`, error)
    // Re-throw the error to be caught by the main POST function's error handler
    throw error
  }
}
