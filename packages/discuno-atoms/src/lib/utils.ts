import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj)
}

export function formatTime(date: Date | string, timeZone?: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone ?? 'UTC',
  }).format(dateObj)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

export function getTimezoneOffset(timeZone: string): string {
  const date = new Date()
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const targetTime = new Date(utc + getTimezoneOffsetMinutes(timeZone) * 60000)
  const offset = targetTime.getTimezoneOffset()
  const sign = offset > 0 ? '-' : '+'
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function getTimezoneOffsetMinutes(timeZone: string): number {
  const date = new Date()
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone,
    timeZoneName: 'longOffset',
  })
  const parts = formatter.formatToParts(date)
  const offsetPart = parts.find(part => part.type === 'timeZoneName')
  if (!offsetPart) return 0

  const offset = offsetPart.value
  if (offset === 'GMT') return 0

  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset)
  if (!match?.[1] || !match[2] || !match[3]) return 0

  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3], 10)

  return sign * (hours * 60 + minutes)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function generateUID(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function parseCalComDateTime(dateTimeString: string): Date {
  // Handle Cal.com's datetime format
  if (dateTimeString.includes('T')) {
    return new Date(dateTimeString)
  }
  // Handle date-only strings
  return new Date(dateTimeString + 'T00:00:00.000Z')
}

export function formatCalComDateTime(date: Date): string {
  return date.toISOString()
}

export function getAvailableTimeSlots(
  availability: { startTime: string; endTime: string }[],
  duration: number,
  interval = 30
): string[] {
  const slots: string[] = []

  for (const { startTime, endTime } of availability) {
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(`1970-01-01T${endTime}`)

    let current = new Date(start)
    while (current.getTime() + duration * 60 * 1000 <= end.getTime()) {
      slots.push(current.toTimeString().slice(0, 5))
      current = new Date(current.getTime() + interval * 60 * 1000)
    }
  }

  return slots
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
