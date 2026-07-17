import { describe, expect, it } from 'vitest'
import { getBookingGroup, groupBookings } from './booking-groups'
import type { Booking } from './booking-types'

const now = new Date('2026-07-17T16:00:00.000Z')

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 1,
  calcomBookingId: 101,
  calcomUid: 'booking-1',
  title: 'Choosing a major',
  description: null,
  startTime: new Date('2026-07-18T16:00:00.000Z'),
  endTime: new Date('2026-07-18T16:30:00.000Z'),
  status: 'ACCEPTED',
  meetingUrl: 'https://meet.example.com/booking-1',
  attendeeName: 'Student One',
  attendeeEmail: 'student@example.com',
  attendeeTimeZone: 'America/New_York',
  createdAt: new Date('2026-07-17T12:00:00.000Z'),
  ...overrides,
})

describe('mentor booking groups', () => {
  it('keeps a cancelled future booking out of Upcoming', () => {
    expect(getBookingGroup(makeBooking({ status: 'CANCELLED' }), now)).toBe('cancelled')
  })

  it('treats completed, no-show, and ended active bookings as history', () => {
    expect(getBookingGroup(makeBooking({ status: 'COMPLETED' }), now)).toBe('completed')
    expect(getBookingGroup(makeBooking({ status: 'NO_SHOW' }), now)).toBe('completed')
    expect(
      getBookingGroup(
        makeBooking({
          status: 'ACCEPTED',
          endTime: new Date('2026-07-17T15:59:00.000Z'),
        }),
        now
      )
    ).toBe('completed')
  })

  it('sorts upcoming sessions soonest first and history newest first', () => {
    const groups = groupBookings(
      [
        makeBooking({ id: 1, startTime: new Date('2026-07-20T16:00:00.000Z') }),
        makeBooking({ id: 2, startTime: new Date('2026-07-18T16:00:00.000Z') }),
        makeBooking({
          id: 3,
          status: 'COMPLETED',
          startTime: new Date('2026-07-15T16:00:00.000Z'),
        }),
        makeBooking({
          id: 4,
          status: 'COMPLETED',
          startTime: new Date('2026-07-16T16:00:00.000Z'),
        }),
      ],
      now
    )

    expect(groups.upcoming.map(booking => booking.id)).toEqual([2, 1])
    expect(groups.completed.map(booking => booking.id)).toEqual([4, 3])
  })
})
