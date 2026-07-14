import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { env } from '~/env'
import { upsertStripeAccount } from '~/server/dal/stripe'
import { stripe } from '~/lib/stripe'

export async function POST(req: Request) {
  const signature = (await headers()).get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      env.STRIPE_CONNECT_WEBHOOK_SECRET
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ Webhook signature verification failed: ${errorMessage}`)
    return new Response('Invalid webhook signature', {
      status: 400,
    })
  }

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break

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
 * Handle Stripe account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const userId = account.metadata?.userId

    if (!userId) {
      console.error(`❌ Stripe account ${account.id} has no userId in metadata.`)
      return
    }

    const disabledReason = account.requirements?.disabled_reason
    const stripeAccountStatus =
      account.charges_enabled && account.payouts_enabled
        ? 'active'
        : disabledReason?.startsWith('rejected')
          ? 'inactive'
          : account.details_submitted
            ? 'restricted'
            : 'pending'

    await upsertStripeAccount({
      userId,
      stripeAccountId: account.id,
      stripeAccountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
    })

    console.log(`✅ Successfully handled account update for Stripe account: ${account.id}`)
  } catch (error) {
    console.error(`❌ Error handling account update for Stripe account ${account.id}:`, error)
    // Re-throw the error to be caught by the main POST function's error handler
    throw error
  }
}
