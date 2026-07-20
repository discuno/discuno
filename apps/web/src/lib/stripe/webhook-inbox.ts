import 'server-only'

import { inngest } from '~/inngest/client'
import {
  markStripeWebhookReceiptQueued,
  persistStripeWebhookReceipt,
  type StripeWebhookSource,
} from '~/server/dal/webhooks'

export const enqueueVerifiedStripeWebhook = async ({
  eventId,
  eventType,
  source,
  connectedAccountId = null,
}: {
  eventId: string
  eventType: string
  source: StripeWebhookSource
  connectedAccountId?: string | null
}): Promise<{ duplicate: boolean }> => {
  const receipt = await persistStripeWebhookReceipt({
    eventId,
    eventType,
    source,
    connectedAccountId,
  })
  if (receipt.processedAt || receipt.quarantinedAt) return { duplicate: true }

  const eventName =
    source === 'connect' ? 'stripe/connect-webhook.received' : 'stripe/webhook.received'
  await inngest.send({
    id: `stripe-${source}-webhook-${eventId}`,
    name: eventName,
    data: { inboxId: receipt.id },
  })
  await markStripeWebhookReceiptQueued(receipt.id)
  return { duplicate: false }
}
