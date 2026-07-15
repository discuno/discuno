import { serve } from 'inngest/next'
import { inngest } from '~/inngest/client'
import {
  cleanupDisconnectedCalcomWebhook,
  processCheckoutSideEffects,
  processCalcomWebhook,
  processMentorPayout,
  processStripeConnectWebhook,
  processStripeWebhook,
  reconcileCalcomWebhookInbox,
  reconcileCalcomWebhookCleanup,
  reconcileCalcomConnections,
  reconcileEligibleMentorPayouts,
  reconcileStripeWebhookInbox,
  syncCalcomConnection,
  verifyReadyCalcomConnections,
} from '~/inngest/functions'
import { verifyInngestInvocation } from '~/inngest/operational-smoke'

export const maxDuration = 60

/**
 * Inngest API endpoint
 * Handles incoming requests from Inngest to execute background functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncCalcomConnection, // OAuth follow-up webhook/event-type synchronization with retries
    reconcileCalcomConnections, // Recover active OAuth connections missing webhook readiness
    verifyReadyCalcomConnections, // Re-provision ready webhooks and rotate encrypted identities
    cleanupDisconnectedCalcomWebhook, // Remove old-account webhooks from the durable cleanup outbox
    reconcileCalcomWebhookCleanup, // Recover cleanup work stranded by queue or worker outages
    processCalcomWebhook, // Signed Cal.com inbox records are retried without event-payload PII
    reconcileCalcomWebhookInbox, // Periodic recovery for persisted events stranded by queue outages
    processStripeWebhook, // Verified Stripe event IDs are durably processed off the request path
    processStripeConnectWebhook, // Connected-account updates use the same durable boundary
    reconcileStripeWebhookInbox, // Recovery for verified Stripe receipts after queue/worker outages
    processCheckoutSideEffects, // Checkout session side effects (Cal.com booking, PostHog, refunds, emails)
    processMentorPayout, // Delayed, policy-gated Stripe transfer to the mentor
    reconcileEligibleMentorPayouts, // Hourly recovery for due transfers missed by event delivery
    verifyInngestInvocation, // Side-effect-free Cloud-to-deployment operational probe
  ],
})
