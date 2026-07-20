import { describe, expect, it } from 'vitest'
import {
  BookingAuditSnapshotSchema,
  CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT,
  LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT,
  createCalcomWebhookBookingAuditSnapshot,
} from '~/lib/calcom/booking-audit'

describe('Cal.com booking audit snapshots', () => {
  it('retains only non-PII webhook provenance', () => {
    const snapshot = createCalcomWebhookBookingAuditSnapshot({
      triggerEvent: 'BOOKING_CREATED',
      eventCreatedAt: '2026-07-14T12:00:00.000Z',
    })

    expect(snapshot).toEqual({
      version: 1,
      source: 'calcom_webhook',
      triggerEvent: 'BOOKING_CREATED',
      eventCreatedAt: '2026-07-14T12:00:00.000Z',
    })
    expect(JSON.stringify(snapshot)).not.toContain('email')
    expect(JSON.stringify(snapshot)).not.toContain('attendee')
  })

  it('rejects extra provider fields so future writes cannot reintroduce raw payloads', () => {
    expect(
      BookingAuditSnapshotSchema.safeParse({
        version: 1,
        source: 'calcom_webhook',
        triggerEvent: 'BOOKING_CREATED',
        attendeeEmail: 'private.student@example.com',
      }).success
    ).toBe(false)
  })

  it('recognizes the privacy-minimal reconciliation and legacy scrub markers', () => {
    expect(
      BookingAuditSnapshotSchema.parse(CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT)
    ).toEqual(CHECKOUT_RECONCILIATION_BOOKING_AUDIT_SNAPSHOT)
    expect(BookingAuditSnapshotSchema.parse(LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT)).toEqual(
      LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT
    )
  })
})
