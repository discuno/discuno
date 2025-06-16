import { cn, formatDate, formatDuration, formatTime, isValidEmail, slugify } from '../utils'

describe('Utils', () => {
  describe('cn (className merging)', () => {
    it('merges class names correctly', () => {
      expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
    })

    it('resolves Tailwind conflicts', () => {
      expect(cn('px-4', 'px-2')).toBe('px-2')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('handles undefined and null values', () => {
      expect(cn('base', null, undefined, 'end')).toBe('base end')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toMatch(/January 15, 2024/)
    })

    it('handles custom format options', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })).toMatch(
        /Jan 15, 2024/
      )
    })
  })

  describe('formatTime', () => {
    it('formats time correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatTime(date)).toMatch(/10:30/)
    })
  })

  describe('formatDuration', () => {
    it('formats minutes correctly', () => {
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(120)).toBe('2h')
    })

    it('handles edge cases', () => {
      expect(formatDuration(0)).toBe('0m')
      expect(formatDuration(1)).toBe('1m')
      expect(formatDuration(61)).toBe('1h 1m')
    })
  })

  describe('isValidEmail', () => {
    it('validates email addresses correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+label@example.org')).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user.domain.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('slugify', () => {
    it('creates valid slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('Test & Development')).toBe('test-development')
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces')
    })

    it('handles special characters', () => {
      expect(slugify('Test!@#$%^&*()_+')).toBe('test_')
      expect(slugify('café')).toBe('caf')
      expect(slugify('User-Name')).toBe('username')
    })

    it('handles edge cases', () => {
      expect(slugify('')).toBe('')
      expect(slugify('   ')).toBe('-')
      expect(slugify('123')).toBe('123')
    })
  })
})
