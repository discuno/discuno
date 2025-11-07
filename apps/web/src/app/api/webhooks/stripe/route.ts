import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Stripe } from 'stripe'
import { handleCheckoutSessionWebhook } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { env } from '~/env'
import { logger } from '~/lib/logger'
import { stripe } from '~/lib/stripe'

export async function POST(req: Request) {
  const signature = (await headers()).get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(`Webhook Error: ${errorMessage}`, {
      status: 400,
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionSucceeded(event.data.object)
        break

      default:
        logger.info('Unhandled Stripe event type', { eventType: event.type })
    }
  } catch (error) {
    logger.error('Stripe webhook handler failed', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(`Webhook handler error: ${errorMessage}`, {
      status: 500,
    })
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle successful checkout sessions
 */
async function handleCheckoutSessionSucceeded(checkoutSession: Stripe.Checkout.Session) {
  logger.info('Handling successful checkout session', { sessionId: checkoutSession.id })
  try {
    const result = await handleCheckoutSessionWebhook(checkoutSession)

    if (result.success) {
      logger.info('Successfully handled checkout session', { sessionId: checkoutSession.id })
    } else {
      logger.error(`Failed to handle checkout session: ${result.error}`, undefined, {
        sessionId: checkoutSession.id,
      })
      // Throw an error to indicate a processing failure
      throw new Error(`Failed to handle checkout session ${checkoutSession.id}: ${result.error}`)
    }
  } catch (error) {
    logger.error('Error handling checkout session', error, { sessionId: checkoutSession.id })
    // Re-throw the error to be caught by the main POST function's error handler
    throw error
  }
}
