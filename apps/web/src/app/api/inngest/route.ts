import { serve } from 'inngest/next'
import { inngest } from '~/inngest/client'
import {
  processCheckoutSideEffects,
  processMentorPayout,
  reconcileEligibleMentorPayouts,
} from '~/inngest/functions'

export const maxDuration = 60

/**
 * Inngest API endpoint
 * Handles incoming requests from Inngest to execute background functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processCheckoutSideEffects, // Checkout session side effects (Cal.com booking, PostHog, refunds, emails)
    processMentorPayout, // Delayed, policy-gated Stripe transfer to the mentor
    reconcileEligibleMentorPayouts, // Hourly recovery for due transfers missed by event delivery
  ],
})
