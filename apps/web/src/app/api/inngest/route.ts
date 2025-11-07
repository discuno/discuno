import { serve } from 'inngest/next'
import { inngest } from '~/inngest/client'
import { processCheckoutSideEffects } from '~/inngest/functions'

/**
 * Inngest API endpoint
 * Handles incoming requests from Inngest to execute background functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processCheckoutSideEffects, // Checkout session side effects (Cal.com booking, PostHog, refunds, emails)
    // Add more functions here as you create them
  ],
})
