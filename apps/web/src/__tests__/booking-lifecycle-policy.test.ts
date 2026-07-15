import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('~/server/db', () => ({ db: {} }))

import {
  assertBookingLifecycleOwnership,
  shouldReplaceBookingLifecycle,
} from '~/server/dal/bookings'

const current = (
  state: 'ACTIVE' | 'ATTENDEE_NO_SHOW' | 'COMPLETED' | 'HOST_NO_SHOW' | 'CANCELLED',
  eventCreatedAt: string
) => ({
  state,
  financialDisposition:
    state === 'CANCELLED' ? ('REFUND_EARLY_CANCELLATION' as const) : ('NONE' as const),
  mentorPayoutEligible: false,
  eventCreatedAt: new Date(eventCreatedAt),
})

const incoming = (
  state: 'ACTIVE' | 'ATTENDEE_NO_SHOW' | 'COMPLETED' | 'HOST_NO_SHOW' | 'CANCELLED',
  eventCreatedAt: string
) => ({
  calcomUid: 'booking-lifecycle-policy',
  mentorUserId: '11111111-1111-4111-8111-111111111111',
  state,
  financialDisposition:
    state === 'CANCELLED' ? ('REFUND_EARLY_CANCELLATION' as const) : ('NONE' as const),
  eventCreatedAt: new Date(eventCreatedAt),
})

describe('Cal.com booking lifecycle ordering policy', () => {
  it('rejects a lifecycle tombstone owned by another mentor', () => {
    expect(() =>
      assertBookingLifecycleOwnership(
        {
          mentorUserId: '11111111-1111-4111-8111-111111111111',
          calcomUserId: 42,
        },
        {
          mentorUserId: '22222222-2222-4222-8222-222222222222',
          calcomUserId: 42,
        }
      )
    ).toThrow('different Discuno mentor')
  })

  it('never lets an active event resurrect a cancellation', () => {
    expect(
      shouldReplaceBookingLifecycle(
        current('CANCELLED', '2026-07-15T12:00:00.000Z'),
        incoming('ACTIVE', '2026-07-15T13:00:00.000Z')
      )
    ).toBe(false)
  })

  it('lets a terminal event close ACTIVE despite delayed delivery timestamps', () => {
    expect(
      shouldReplaceBookingLifecycle(
        current('ACTIVE', '2026-07-15T13:00:00.000Z'),
        incoming('CANCELLED', '2026-07-15T12:00:00.000Z')
      )
    ).toBe(true)
  })

  it('does not overwrite an attendee no-show with a generic meeting-end event', () => {
    expect(
      shouldReplaceBookingLifecycle(
        current('ATTENDEE_NO_SHOW', '2026-07-15T12:00:00.000Z'),
        incoming('COMPLETED', '2026-07-15T13:00:00.000Z')
      )
    ).toBe(false)
  })

  it('allows Cal to explicitly clear a newer attendee no-show update', () => {
    expect(
      shouldReplaceBookingLifecycle(
        current('ATTENDEE_NO_SHOW', '2026-07-15T12:00:00.000Z'),
        incoming('ACTIVE', '2026-07-15T13:00:00.000Z')
      )
    ).toBe(true)
  })
})
