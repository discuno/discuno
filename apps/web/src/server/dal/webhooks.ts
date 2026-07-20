import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '~/server/db'
import { stripeWebhookInbox } from '~/server/db/schema'

export type StripeWebhookSource = 'platform' | 'connect'

export type StripeWebhookReceipt = {
  id: number
  processedAt: Date | null
  quarantinedAt: Date | null
}

/** Persist a verified Stripe event ID before the endpoint acknowledges it. */
export const persistStripeWebhookReceipt = async ({
  eventId,
  eventType,
  source,
  connectedAccountId,
}: {
  eventId: string
  eventType: string
  source: StripeWebhookSource
  connectedAccountId: string | null
}): Promise<StripeWebhookReceipt> => {
  const [inserted] = await db
    .insert(stripeWebhookInbox)
    .values({ eventId, eventType, source, connectedAccountId })
    .onConflictDoNothing({ target: stripeWebhookInbox.eventId })
    .returning({
      id: stripeWebhookInbox.id,
      processedAt: stripeWebhookInbox.processedAt,
      quarantinedAt: stripeWebhookInbox.quarantinedAt,
    })

  if (inserted) return inserted

  const [existing] = await db
    .select({
      id: stripeWebhookInbox.id,
      processedAt: stripeWebhookInbox.processedAt,
      quarantinedAt: stripeWebhookInbox.quarantinedAt,
    })
    .from(stripeWebhookInbox)
    .where(eq(stripeWebhookInbox.eventId, eventId))
    .limit(1)

  if (!existing) throw new Error('Stripe webhook receipt could not be persisted')
  return existing
}

export const markStripeWebhookReceiptQueued = async (receiptId: number): Promise<void> => {
  const now = new Date()
  await db
    .update(stripeWebhookInbox)
    .set({ queuedAt: now, updatedAt: now })
    .where(and(eq(stripeWebhookInbox.id, receiptId), isNull(stripeWebhookInbox.processedAt)))
}
