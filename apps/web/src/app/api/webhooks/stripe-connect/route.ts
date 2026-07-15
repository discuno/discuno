import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { env } from '~/env'
import { readBoundedUtf8Body, RequestBodyTooLargeError } from '~/lib/http/request-body'
import { getSafeErrorName } from '~/lib/operational-logging'
import { stripe } from '~/lib/stripe'
import { enqueueVerifiedStripeWebhook } from '~/lib/stripe/webhook-inbox'

const MAX_STRIPE_WEBHOOK_BYTES = 1024 * 1024

const configuredStripeLivemode = (): boolean =>
  env.STRIPE_SECRET_KEY.startsWith('sk_live_') || env.STRIPE_SECRET_KEY.startsWith('rk_live_')

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  let body: string

  try {
    body = await readBoundedUtf8Body(req, MAX_STRIPE_WEBHOOK_BYTES)
  } catch (error) {
    const tooLarge = error instanceof RequestBodyTooLargeError
    console.error('Stripe Connect webhook body could not be read', {
      errorName: getSafeErrorName(error),
    })
    return new Response(tooLarge ? 'Payload too large' : 'Invalid webhook payload', {
      status: tooLarge ? 413 : 400,
    })
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_CONNECT_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe Connect webhook signature verification failed', {
      errorName: getSafeErrorName(err),
    })
    return new Response('Invalid webhook signature', {
      status: 400,
    })
  }

  // Stripe Connect webhook endpoints can receive both test and live events.
  // A verified event from the opposite mode cannot be retrieved with this
  // deployment's API key, so acknowledge it without adding an impossible job
  // to the durable inbox.
  if (event.livemode !== configuredStripeLivemode()) {
    console.info('Ignored Stripe Connect webhook from the opposite mode', {
      eventId: event.id,
    })
    return NextResponse.json({ received: true, ignored: true })
  }

  try {
    const result = await enqueueVerifiedStripeWebhook({
      eventId: event.id,
      eventType: event.type,
      source: 'connect',
      connectedAccountId: event.account ?? null,
    })
    return NextResponse.json({ received: true, duplicate: result.duplicate })
  } catch (error) {
    console.error('Failed to persist or queue verified Stripe Connect webhook', {
      eventId: event.id,
      errorName: getSafeErrorName(error),
    })
    return new Response('Webhook queue unavailable', {
      status: 500,
    })
  }
}
