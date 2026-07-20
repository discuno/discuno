import 'server-only'

import { asc, inArray, sql } from 'drizzle-orm'
import { LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT } from '~/lib/calcom/booking-audit'
import { db } from '~/server/db'
import { booking } from '~/server/db/schema'

const DEFAULT_SCRUB_BATCH_SIZE = 250

/**
 * Select only rows that are not one of Discuno's strict, privacy-minimal audit
 * shapes. The object-key check also catches a historical provider payload that
 * happens to contain our version/source marker alongside attendee PII.
 */
const legacyWebhookPayloadCondition = sql<boolean>`
  case
    when jsonb_typeof(${booking.webhookPayload}) is distinct from 'object' then true
    when coalesce(${booking.webhookPayload} ->> 'version', '') <> '1' then true
    when coalesce(${booking.webhookPayload} ->> 'source', '') not in (
      'calcom_webhook',
      'discuno_checkout_reconciliation',
      'legacy_calcom_webhook_scrub'
    ) then true
    when exists (
      select 1
      from jsonb_object_keys(${booking.webhookPayload}) as audit_key(key)
      where key not in ('version', 'source', 'triggerEvent', 'eventCreatedAt')
    ) then true
    else false
  end
`

/**
 * Idempotently scrub one bounded batch of legacy booking payloads. This is safe
 * to run from cron or manually: already-minimal rows are excluded and concurrent
 * callers only write the same non-PII marker.
 */
export const scrubLegacyBookingWebhookPayloads = async (
  batchSize = DEFAULT_SCRUB_BATCH_SIZE
): Promise<number> => {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new RangeError('Booking webhook scrub batch size must be between 1 and 1000')
  }

  const candidates = await db
    .select({ id: booking.id })
    .from(booking)
    .where(legacyWebhookPayloadCondition)
    .orderBy(asc(booking.id))
    .limit(batchSize)

  if (candidates.length === 0) return 0

  const scrubbed = await db
    .update(booking)
    .set({ webhookPayload: LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT })
    .where(
      inArray(
        booking.id,
        candidates.map(candidate => candidate.id)
      )
    )
    .returning({ id: booking.id })

  return scrubbed.length
}
