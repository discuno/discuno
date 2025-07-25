import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { handlePaymentIntentWebhook } from '~/app/(app)/(public)/mentor/[username]/book/actions'
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
 * Handle successful payment intents
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const result = await handlePaymentIntentWebhook(paymentIntent)
    if (!result.success) {
      console.error(`❌ Failed to handle payment intent: ${result.error}`)
    } else {
      console.log(`✅ Successfully handled payment intent: ${paymentIntent.id}`)
    }
  } catch (error) {
    console.error(`❌ Error handling payment intent: ${error}`)
  }
}

/**
 * Handle transfer creation (when funds are sent to mentors)
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Transfer created: ${transfer.id} for ${transfer.amount} ${transfer.currency}`)

  // Update transfer status in database if needed
  // This can be used for additional monitoring and reconciliation
}
