import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { handlePaymentIntentComplete } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { env } from '~/env'
import { stripe } from '~/lib/stripe'
import { upsertMentorStripeAccount } from '~/server/queries'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') ?? ''
  const bodyBuffer = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(bodyBuffer, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ Webhook signature verification failed: ${errorMessage}`)
    return new Response(`Webhook Error: ${errorMessage}`, {
      status: 400,
    })
  }

  switch (event.type) {
    case 'account.updated':
      await handleAccountUpdated(event.data.object)
      break

    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object)
      break

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object)
      break

    case 'transfer.created':
      await handleTransferCreated(event.data.object)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle Stripe account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  const userId = account.metadata?.userId

  if (!userId) {
    console.error(`❌ Stripe account ${account.id} has no userId in metadata.`)
    return
  }

  await upsertMentorStripeAccount({
    userId,
    stripeAccountId: account.id,
    stripeAccountStatus: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  })
}

/**
 * Handle completed checkout sessions
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout session completed: ${session.id}`)
  try {
    // Get the payment intent from the checkout session
    if (session.payment_intent && typeof session.payment_intent === 'string') {
      await handlePaymentIntentComplete(session.payment_intent)
      console.log(`Successfully processed checkout session: ${session.id}`)
    } else {
      console.error(`No payment intent found in checkout session: ${session.id}`)
    }
  } catch (error) {
    console.error(`Failed to process checkout session ${session.id}:`, error)
    // Send admin alert for failed checkout processing (placeholder for now)
    console.error('ADMIN ALERT: Checkout session processing failed', {
      sessionId: session.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Handle successful payment intents
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent succeeded: ${paymentIntent.id}`)

  // Update payment status if needed
  // Most processing is done in checkout.session.completed
}

/**
 * Handle transfer creation (when funds are sent to mentors)
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Transfer created: ${transfer.id} for ${transfer.amount} ${transfer.currency}`)

  // Update transfer status in database if needed
  // This can be used for additional monitoring and reconciliation
}
