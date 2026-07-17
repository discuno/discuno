import { availabilitySchema, type Availability, type TimeInterval } from '~/app/types/availability'

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const dayLabels: Record<keyof Availability['weeklySchedule'], string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
}

export type IntervalValidation =
  | { kind: 'format'; message: string }
  | { kind: 'order'; message: string }
  | { kind: 'overlap'; message: string }
  | { kind: 'empty'; message: string }

export function getIntervalValidation(
  intervals: TimeInterval[],
  options: { allowEmpty?: boolean } = {}
): IntervalValidation | null {
  if (intervals.length === 0) {
    return options.allowEmpty === false
      ? { kind: 'empty', message: 'Add at least one available time window.' }
      : null
  }

  if (
    intervals.some(
      interval => !TIME_PATTERN.test(interval.start) || !TIME_PATTERN.test(interval.end)
    )
  ) {
    return { kind: 'format', message: 'Enter each time in a valid hour-and-minute format.' }
  }

  if (intervals.some(interval => interval.start >= interval.end)) {
    return { kind: 'order', message: 'Each end time must be later than its start time.' }
  }

  const sorted = [...intervals].sort((left, right) => left.start.localeCompare(right.start))
  const overlaps = sorted.some((interval, index) => {
    const previous = sorted[index - 1]
    return previous !== undefined && previous.end > interval.start
  })

  return overlaps ? { kind: 'overlap', message: 'Time windows cannot overlap.' } : null
}

export function isValidDateKey(value: string) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)

  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  )
}

/** Formats a calendar date without crossing a day boundary through UTC conversion. */
export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parses a provider date as a local calendar value, rather than as a UTC instant. */
export function fromDateKey(value: string) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return null

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return isValidDateKey(value) ? parsed : null
}

export function formatDateKey(value: string, options: Intl.DateTimeFormatOptions) {
  const date = fromDateKey(value)
  return date ? date.toLocaleDateString(undefined, options) : value
}

export function getAvailabilityValidationMessage(availability: Availability) {
  for (const [day, intervals] of Object.entries(availability.weeklySchedule) as Array<
    [keyof Availability['weeklySchedule'], TimeInterval[]]
  >) {
    const validation = getIntervalValidation(intervals)
    if (validation) return `${dayLabels[day]}: ${validation.message}`
  }

  const seenDates = new Set<string>()
  for (const override of availability.dateOverrides) {
    if (!isValidDateKey(override.date)) return 'One date exception has an invalid date.'
    if (seenDates.has(override.date)) return 'Each date can have only one exception.'
    seenDates.add(override.date)

    const validation = getIntervalValidation(override.intervals, { allowEmpty: false })
    if (validation) {
      return `${formatDateKey(override.date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}: ${validation.message}`
    }
  }

  const parsed = availabilitySchema.safeParse(availability)
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Review the times in your schedule.'
  }

  return null
}

const toMinutes = (value: string) => {
  if (!TIME_PATTERN.test(value)) return null
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const fromMinutes = (value: number) => {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Picks a useful non-overlapping hour instead of adding another conflicting 9–5 window. */
export function getNextAvailableInterval(intervals: TimeInterval[]): TimeInterval | null {
  const occupied = intervals.flatMap(interval => {
    const start = toMinutes(interval.start)
    const end = toMinutes(interval.end)
    return start !== null && end !== null && start < end ? [{ start, end }] : []
  })

  const candidateStarts = [
    ...Array.from({ length: 28 }, (_, index) => 9 * 60 + index * 30),
    ...Array.from({ length: 18 }, (_, index) => index * 30),
  ].filter(start => start + 60 <= 23 * 60 + 30)

  const start = candidateStarts.find(candidate =>
    occupied.every(interval => candidate + 60 <= interval.start || candidate >= interval.end)
  )

  return start === undefined
    ? null
    : {
        start: fromMinutes(start),
        end: fromMinutes(start + 60),
      }
}

export function availabilityEquals(left: Availability, right: Availability) {
  return JSON.stringify(left) === JSON.stringify(right)
}
