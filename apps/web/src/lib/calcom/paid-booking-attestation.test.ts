import { describe, expect, it } from 'vitest'
import {
  paidCalcomBookingMatchesCheckout,
  type PaidBookingProviderSnapshot,
} from './paid-booking-attestation'

const checkout = {
  actorUserId: '22222222-2222-4222-8222-222222222222',
  attendeeEmail: 'student@example.edu',
  eventTypeId: '42',
  eventDurationMinutes: '60',
  mentorUserId: '11111111-1111-4111-8111-111111111111',
  startTime: '2030-01-01T12:00:00.000Z',
}

const booking = {
  id: 77,
  uid: 'cal-current',
  status: 'accepted',
  start: checkout.startTime,
  end: '2030-01-01T13:00:00.000Z',
  duration: 60,
  eventTypeId: 42,
  attendees: [{ email: checkout.attendeeEmail }],
  metadata: {
    paymentId: '9',
    mentorUserId: checkout.mentorUserId,
    actorUserId: checkout.actorUserId,
  },
}

const matches = (
  providerOverrides: Partial<PaidBookingProviderSnapshot> = {},
  inputOverrides: Partial<Parameters<typeof paidCalcomBookingMatchesCheckout>[0]> = {}
) =>
  paidCalcomBookingMatchesCheckout({
    booking: { ...booking, ...providerOverrides },
    checkout,
    paymentId: 9,
    expectedUid: booking.uid,
    expectedBookingId: booking.id,
    expectedCurrentStart: new Date(booking.start),
    rescheduledFromUid: null,
    ...inputOverrides,
  })

describe('paid Cal.com booking attestation', () => {
  it('accepts the exact provider-backed original booking', () => {
    expect(matches()).toBe(true)
  })

  it('accepts a provider-linked reschedule at a new time', () => {
    expect(
      matches(
        {
          start: '2030-01-02T15:00:00.000Z',
          end: '2030-01-02T16:00:00.000Z',
          rescheduledFromUid: 'cal-previous',
        },
        {
          expectedCurrentStart: new Date('2030-01-02T15:00:00.000Z'),
          rescheduledFromUid: 'cal-previous',
        }
      )
    ).toBe(true)
  })

  it.each([
    ['provider ID', { id: 78 }],
    ['event type', { eventTypeId: 43 }],
    ['attendee', { attendees: [{ email: 'accomplice@example.edu' }] }],
    [
      'actor metadata',
      { metadata: { ...booking.metadata, actorUserId: '33333333-3333-4333-8333-333333333333' } },
    ],
    ['payment metadata', { metadata: { ...booking.metadata, paymentId: '10' } }],
  ])('rejects mismatched %s', (_label, override) => {
    expect(matches(override)).toBe(false)
  })
})
