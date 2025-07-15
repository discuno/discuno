import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
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

  if (event.type === 'account.updated') {
    const account = event.data.object

    // The userId is not available in the webhook payload from Stripe by default.
    // It needs to be added to the metadata when the account is created.
    const userId = account.metadata?.userId

    if (!userId) {
      // If we don't have a userId, we can't link the Stripe account to a user.
      // This is a critical issue, but not a webhook processing error.
      // We should log it and return a 200 to acknowledge receipt of the event.
      console.error(`❌ Stripe account ${account.id} has no userId in metadata.`)
      return NextResponse.json({ received: true })
    }

    await upsertMentorStripeAccount({
      userId,
      stripeAccountId: account.id,
      stripeAccountStatus:
        account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
    })
  }

  return NextResponse.json({ received: true })
}
