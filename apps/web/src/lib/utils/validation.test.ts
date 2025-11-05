import { describe, expect, it } from 'vitest'
import { validateEmail } from './validation'

describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.com')).toBe(true)
    expect(validateEmail('user+tag@example.co.uk')).toBe(true)
    expect(validateEmail('user_name@subdomain.example.com')).toBe(true)
    expect(validateEmail('123@example.com')).toBe(true)
  })

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
    expect(validateEmail('invalid@domain')).toBe(false)
    expect(validateEmail('invalid @domain.com')).toBe(false)
    expect(validateEmail('invalid@domain .com')).toBe(false)
    expect(validateEmail('invalid@domain..com')).toBe(false)
  })

  it('should handle edge cases', () => {
    expect(validateEmail('a@b.c')).toBe(true)
    expect(validateEmail('user@localhost.localdomain')).toBe(true)
  })
})
