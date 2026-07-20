import { z } from 'zod'

const CalcomBookingWebhookTriggerSchema = z.enum([
  'BOOKING_CREATED',
  'BOOKING_REJECTED',
  'BOOKING_RESCHEDULED',
])

const CalcomWebhookBookingAuditSnapshotSchema = z
  .object({
    version: z.literal(1),
    source: z.literal('calcom_webhook'),
    triggerEvent: CalcomBookingWebhookTriggerSchema,
    eventCreatedAt: z.iso.datetime().optional(),
  })
  .strict()

const CheckoutReconciliationBookingAuditSnapshotSchema = z
  .object({
    version: z.literal(1),
    source: z.literal('discuno_checkout_reconciliation'),
  })
  .strict()

const LegacyScrubbedBookingAuditSnapshotSchema = z
  .object({
    version: z.literal(1),
    source: z.literal('legacy_calcom_webhook_scrub'),
  })
  .strict()

export const BookingAuditSnapshotSchema = z.discriminatedUnion('source', [
  CalcomWebhookBookingAuditSnapshotSchema,
  CheckoutReconciliationBookingAuditSnapshotSchema,
  LegacyScrubbedBookingAuditSnapshotSchema,
])

export type BookingAuditSnapshot = z.infer<typeof BookingAuditSnapshotSchema>
export type CalcomBookingWebhookTrigger = z.infer<typeof CalcomBookingWebhookTriggerSchema>

export const createCalcomWebhookBookingAuditSnapshot = ({
  triggerEvent,
  eventCreatedAt,
}: {
  triggerEvent: CalcomBookingWebhookTrigger
  eventCreatedAt?: string
}): BookingAuditSnapshot =>
  BookingAuditSnapshotSchema.parse({
    version: 1,
    source: 'calcom_webhook',
    triggerEvent,
    ...(eventCreatedAt ? { eventCreatedAt } : {}),
  })

export const CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT = {
  version: 1,
  source: 'discuno_checkout_reconciliation',
} as const satisfies BookingAuditSnapshot

export const LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT = {
  version: 1,
  source: 'legacy_calcom_webhook_scrub',
} as const satisfies BookingAuditSnapshot
