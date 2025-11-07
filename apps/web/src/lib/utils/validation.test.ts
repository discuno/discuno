import { describe, expect, it } from 'vitest'
import { validateEduEmail, validateEmail } from './validation'

describe('validateEmail', () => {
  it('returns true for syntactically valid email addresses', () => {
    expect(validateEmail('test@example.edu')).toBe(true)
    expect(validateEmail('user.name@domain.org')).toBe(true)
    expect(validateEmail('user+tag@example.co.uk')).toBe(true)
    expect(validateEmail('user@gmail.com')).toBe(true)
    expect(validateEmail('user@company.net')).toBe(true)
  })

  it('returns false for invalid email addresses', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@example.edu')).toBe(false)
    expect(validateEmail('invalid@domain')).toBe(false)
    expect(validateEmail('invalid @domain.edu')).toBe(false)
    expect(validateEmail('invalid@domain .edu')).toBe(false)
  })
})

describe('validateEduEmail', () => {
  it('returns true for valid .edu email addresses', () => {
    expect(validateEduEmail('test@example.edu')).toBe(true)
    expect(validateEduEmail('user.name@university.edu')).toBe(true)
    expect(validateEduEmail('user+tag@college.edu')).toBe(true)
    expect(validateEduEmail('user_name@subdomain.university.edu')).toBe(true)
    expect(validateEduEmail('123@school.edu')).toBe(true)
    expect(validateEduEmail('student@UNIVERSITY.EDU')).toBe(true) // Case insensitive
  })

  it('returns false for non-.edu email addresses', () => {
    expect(validateEduEmail('test@example.com')).toBe(false)
    expect(validateEduEmail('user.name@domain.org')).toBe(false)
    expect(validateEduEmail('user+tag@example.co.uk')).toBe(false)
    expect(validateEduEmail('user@gmail.com')).toBe(false)
    expect(validateEduEmail('user@company.net')).toBe(false)
  })

  it('returns false for invalid .edu email addresses', () => {
    expect(validateEduEmail('invalid@domain')).toBe(false)
    expect(validateEduEmail('invalid @domain.edu')).toBe(false)
    expect(validateEduEmail('invalid@domain .edu')).toBe(false)
    expect(validateEduEmail('user@school.education')).toBe(false) // .education not .edu
    expect(validateEduEmail('user@school.edu.au')).toBe(false) // Must end with .edu exactly
  })
})
