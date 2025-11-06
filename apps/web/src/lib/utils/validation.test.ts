import { describe, expect, it } from 'vitest'
import { validateEmail } from './validation'

describe('validateEmail', () => {
  it('should return true for valid .edu email addresses', () => {
    expect(validateEmail('test@example.edu')).toBe(true)
    expect(validateEmail('user.name@university.edu')).toBe(true)
    expect(validateEmail('user+tag@college.edu')).toBe(true)
    expect(validateEmail('user_name@subdomain.university.edu')).toBe(true)
    expect(validateEmail('123@school.edu')).toBe(true)
    expect(validateEmail('student@UNIVERSITY.EDU')).toBe(true) // Case insensitive
  })

  it('should return false for non-.edu email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(false)
    expect(validateEmail('user.name@domain.org')).toBe(false)
    expect(validateEmail('user+tag@example.co.uk')).toBe(false)
    expect(validateEmail('user@gmail.com')).toBe(false)
    expect(validateEmail('user@company.net')).toBe(false)
  })

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@example.edu')).toBe(false)
    expect(validateEmail('invalid@domain')).toBe(false)
    expect(validateEmail('invalid @domain.edu')).toBe(false)
    expect(validateEmail('invalid@domain .edu')).toBe(false)
  })

  it('should handle edge cases', () => {
    expect(validateEmail('a@b.edu')).toBe(true)
    expect(validateEmail('user@localhost.edu')).toBe(true)
    expect(validateEmail('user@school.education')).toBe(false) // .education not .edu
    expect(validateEmail('user@school.edu.au')).toBe(false) // Must end with .edu exactly
  })
})
