import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { joinWaitlist } from './actions'

// Mock the queries module
vi.mock('./queries', () => ({
  getWaitlistEntry: vi.fn(),
}))

const { getWaitlistEntry } = await import('./queries')

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('joinWaitlist', () => {
    it('should successfully add new email to waitlist', async () => {
      const email = 'test@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      vi.mocked(getWaitlistEntry).mockResolvedValue({
        isNewEntry: true,
        error: null,
      })

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).toHaveBeenCalledWith(email.toLowerCase().trim())
      expect(result).toEqual({ status: 'success' })
    })

    it('should handle already registered email', async () => {
      const email = 'existing@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      vi.mocked(getWaitlistEntry).mockResolvedValue({
        isNewEntry: false,
        error: null,
      })

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).toHaveBeenCalledWith(email.toLowerCase().trim())
      expect(result).toEqual({ status: 'already-registered' })
    })

    it('should handle invalid email format', async () => {
      const invalidEmail = 'not-an-email'
      const formData = new FormData()
      formData.append('email', invalidEmail)

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).not.toHaveBeenCalled()
      expect(result).toEqual({ status: 'invalid-email' })
    })

    it('should handle missing email in form data', async () => {
      const formData = new FormData()
      // No email appended

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).not.toHaveBeenCalled()
      expect(result).toEqual({ status: 'invalid-email' })
    })

    it('should handle null email in form data', async () => {
      const formData = new FormData()
      formData.append('email', '')

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).not.toHaveBeenCalled()
      expect(result).toEqual({ status: 'invalid-email' })
    })

    it('should handle database errors from getWaitlistEntry', async () => {
      const email = 'test@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      vi.mocked(getWaitlistEntry).mockResolvedValue({
        isNewEntry: false,
        error: 'Database connection failed',
      })

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).toHaveBeenCalledWith(email.toLowerCase().trim())
      expect(result).toEqual({ status: 'error' })
    })

    it('should handle exceptions from getWaitlistEntry', async () => {
      const email = 'test@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(getWaitlistEntry).mockRejectedValue(new Error('Network error'))

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).toHaveBeenCalledWith(email.toLowerCase().trim())
      expect(result).toEqual({ status: 'error' })
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in joinWaitlist action:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })

    it('should validate edge case email formats', async () => {
      const testCases = [
        { email: 'valid@domain.com', expectValid: true },
        { email: 'user+tag@domain.co.uk', expectValid: true },
        { email: 'user.name@domain-name.org', expectValid: true },
        { email: '@domain.com', expectValid: false },
        { email: 'user@', expectValid: false },
        { email: 'user@domain', expectValid: false },
        { email: 'user domain@email.com', expectValid: false },
        { email: '', expectValid: false },
      ]

      for (const testCase of testCases) {
        const formData = new FormData()
        formData.append('email', testCase.email)

        if (testCase.expectValid) {
          vi.mocked(getWaitlistEntry).mockResolvedValueOnce({
            isNewEntry: true,
            error: null,
          })
        }

        const result = await joinWaitlist(formData)

        if (testCase.expectValid) {
          expect(result.status).not.toBe('invalid-email')
        } else {
          expect(result.status).toBe('invalid-email')
        }
      }
    })

    it('should handle file upload instead of text input', async () => {
      const formData = new FormData()
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      formData.append('email', file)

      const result = await joinWaitlist(formData)

      expect(getWaitlistEntry).not.toHaveBeenCalled()
      expect(result).toEqual({ status: 'invalid-email' })
    })

    it('should maintain type safety with FormData operations', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('otherField', 'ignored')

      vi.mocked(getWaitlistEntry).mockResolvedValue({
        isNewEntry: true,
        error: null,
      })

      const result = await joinWaitlist(formData)

      // Should only use the email field, ignore other fields
      expect(getWaitlistEntry).toHaveBeenCalledWith('test@example.com')
      expect(result).toEqual({ status: 'success' })
    })
  })

  describe('Input Validation', () => {
    it('should handle various malformed emails', async () => {
      const malformedEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain.',
        'spaces in@email.com',
        'email@domain..com',
        'email@@domain.com',
      ]

      for (const email of malformedEmails) {
        const formData = new FormData()
        formData.append('email', email)

        const result = await joinWaitlist(formData)

        expect(result).toEqual({ status: 'invalid-email' })
        expect(getWaitlistEntry).not.toHaveBeenCalled()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle timeout errors gracefully', async () => {
      const email = 'test@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(getWaitlistEntry).mockRejectedValue(new Error('Timeout'))

      const result = await joinWaitlist(formData)

      expect(result).toEqual({ status: 'error' })
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle database constraint violations', async () => {
      const email = 'test@university.edu'
      const formData = new FormData()
      formData.append('email', email)

      vi.mocked(getWaitlistEntry).mockResolvedValue({
        isNewEntry: false,
        error: 'UNIQUE constraint failed',
      })

      const result = await joinWaitlist(formData)

      expect(result).toEqual({ status: 'error' })
    })
  })
})
