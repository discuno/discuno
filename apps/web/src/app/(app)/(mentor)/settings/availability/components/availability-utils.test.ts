import { describe, expect, it } from 'vitest'
import type { Availability } from '~/app/types/availability'
import {
  fromDateKey,
  getAvailabilityValidationMessage,
  getIntervalValidation,
  getNextAvailableInterval,
  isValidDateKey,
  toDateKey,
} from './availability-utils'

const makeAvailability = (overrides: Partial<Availability> = {}): Availability => ({
  id: '42',
  weeklySchedule: {
    sunday: [],
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  },
  dateOverrides: [],
  ...overrides,
})

describe('availability draft utilities', () => {
  it('allows adjacent windows but rejects overlapping ones', () => {
    expect(
      getIntervalValidation([
        { start: '09:00', end: '12:00' },
        { start: '12:00', end: '13:00' },
      ])
    ).toBeNull()

    expect(
      getIntervalValidation([
        { start: '09:00', end: '12:00' },
        { start: '11:59', end: '13:00' },
      ])
    ).toEqual({ kind: 'overlap', message: 'Time windows cannot overlap.' })
  })

  it('rejects an empty date exception because it cannot be persisted by the schedule payload', () => {
    const message = getAvailabilityValidationMessage(
      makeAvailability({ dateOverrides: [{ date: '2026-07-20', intervals: [] }] })
    )

    expect(message).toContain('Add at least one available time window.')
  })

  it('returns a contextual validation message for a weekly error', () => {
    const message = getAvailabilityValidationMessage(
      makeAvailability({
        weeklySchedule: {
          ...makeAvailability().weeklySchedule,
          monday: [{ start: '17:00', end: '09:00' }],
        },
      })
    )

    expect(message).toBe('Monday: Each end time must be later than its start time.')
  })

  it('formats and parses calendar dates without a UTC conversion', () => {
    const lateLocalDate = new Date(2026, 6, 20, 23, 45)

    expect(toDateKey(lateLocalDate)).toBe('2026-07-20')
    expect(fromDateKey('2026-07-20')).toEqual(new Date(2026, 6, 20))
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(fromDateKey('2026-02-29')).toBeNull()
  })

  it('adds the next open hour instead of another overlapping default window', () => {
    expect(getNextAvailableInterval([{ start: '09:00', end: '17:00' }])).toEqual({
      start: '17:00',
      end: '18:00',
    })
  })
})
