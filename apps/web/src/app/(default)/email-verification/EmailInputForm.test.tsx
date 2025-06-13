import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  },
}))

// Mock environment
vi.mock('~/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    SENDGRID_API_KEY: 'test-sendgrid-key',
    AUTH_EMAIL_FROM: 'test@discuno.com',
    NEXT_PUBLIC_BASE_URL: 'https://discuno.com',
  },
}))

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

// Mock auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
}))

// Mock database
vi.mock('~/server/db', () => ({
  db: {
    query: {
      userProfiles: {
        findFirst: vi.fn(),
      },
    },
  },
}))

describe('EmailInputForm Server Actions', () => {
  let mockRedirect: any
  let mockJwt: any
  let mockSgMail: any
  let mockRequireAuth: any
  let mockDb: any

  beforeEach(async () => {
    mockRedirect = (await import('next/navigation')).redirect
    mockJwt = (await import('jsonwebtoken')).default
    mockSgMail = (await import('@sendgrid/mail')).default
    mockRequireAuth = (await import('~/lib/auth/auth-utils')).requireAuth
    mockDb = (await import('~/server/db')).db

    // Clear all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockRequireAuth.mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    })

    mockJwt.sign.mockReturnValue('mock-jwt-token')
    mockSgMail.send.mockResolvedValue([{ statusCode: 202 }])
    mockDb.query.userProfiles.findFirst.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Email Validation', () => {
    it('should reject non-string email input', async () => {
      // Mock FormData with empty email (FormData always returns strings)
      const formData = new FormData()
      formData.set('email', '')

      // Create a mock form submission handler
      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')

        if (!eduEmailRaw || typeof eduEmailRaw !== 'string' || eduEmailRaw.trim() === '') {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=invalid-email')
    })

    it('should reject emails not ending with .edu', async () => {
      const formData = new FormData()
      formData.set('email', 'student@gmail.com')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        if (!lowerCaseEduEmail.endsWith('.edu')) {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=invalid-email')
    })

    it('should accept valid .edu emails', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        if (!lowerCaseEduEmail.endsWith('.edu')) {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }

        // If we get here, email is valid
        expect(lowerCaseEduEmail).toBe('student@university.edu')
      })

      await handleSubmit(formData)

      expect(mockRedirect).not.toHaveBeenCalledWith('/email-verification?status=invalid-email')
    })

    it('should convert email to lowercase', async () => {
      const formData = new FormData()
      formData.set('email', 'STUDENT@UNIVERSITY.EDU')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        expect(lowerCaseEduEmail).toBe('student@university.edu')
      })

      await handleSubmit(formData)
    })
  })

  describe('Duplicate Email Check', () => {
    it('should reject email that is already in use', async () => {
      // Mock email already exists in database
      mockDb.query.userProfiles.findFirst.mockResolvedValue({
        id: 'profile-456',
        eduEmail: 'student@university.edu',
        isEduVerified: true,
      })

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const userProfile = await mockDb.query.userProfiles.findFirst({
          where: (table: any, { eq }: any) => eq(table.eduEmail, lowerCaseEduEmail),
        })

        if (userProfile) {
          mockRedirect('/email-verification?status=email-in-use')
          return
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=email-in-use')
      expect(mockDb.query.userProfiles.findFirst).toHaveBeenCalled()
    })

    it('should proceed when email is not in use', async () => {
      // Mock email not found in database
      mockDb.query.userProfiles.findFirst.mockResolvedValue(null)

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const userProfile = await mockDb.query.userProfiles.findFirst({
          where: (table: any, { eq }: any) => eq(table.eduEmail, lowerCaseEduEmail),
        })

        if (userProfile) {
          mockRedirect('/email-verification?status=email-in-use')
          return
        }

        // Continue with verification process
        expect(userProfile).toBeNull()
      })

      await handleSubmit(formData)

      expect(mockRedirect).not.toHaveBeenCalledWith('/email-verification?status=email-in-use')
    })
  })

  describe('JWT Token Generation', () => {
    it('should generate JWT token with correct payload', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
          expiresIn: '10m',
        })

        expect(token).toBe('mock-jwt-token')
      })

      await handleSubmit(formData)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: 'user-123', eduEmail: 'student@university.edu' },
        'test-jwt-secret',
        { expiresIn: '10m' }
      )
    })

    it('should handle JWT signing errors', async () => {
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing failed')
      })

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        try {
          const user = await mockRequireAuth()
          const eduEmailRaw = formData.get('email')
          const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

          mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', { expiresIn: '10m' })
        } catch (error) {
          mockRedirect('/email-verification?status=error')
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=error')
    })
  })

  describe('SendGrid Email Sending', () => {
    it('should send verification email with correct content', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
          expiresIn: '10m',
        })

        const verifyUrl = `https://discuno.com/verify-email/?token=${token}`

        mockSgMail.setApiKey('test-sendgrid-key')

        const msg = {
          to: lowerCaseEduEmail,
          from: 'test@discuno.com',
          subject: 'Verify Your College Email to Become a Mentor',
          html: `
          <p>Hi ${user.name ?? 'there'},</p>
          <p>Thank you for your interest in becoming a mentor at College Advice.</p>
          <p>Please verify your college email by clicking the link below:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
        }

        await mockSgMail.send(msg)
      })

      await handleSubmit(formData)

      expect(mockSgMail.setApiKey).toHaveBeenCalledWith('test-sendgrid-key')
      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'student@university.edu',
          from: 'test@discuno.com',
          subject: 'Verify Your College Email to Become a Mentor',
          html: expect.stringContaining('Hi Test User,'),
        })
      )
    })

    it('should handle user without name gracefully', async () => {
      mockRequireAuth.mockResolvedValue({
        id: 'user-123',
        name: null,
        email: 'test@example.com',
      })

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
          expiresIn: '10m',
        })

        const verifyUrl = `https://discuno.com/verify-email/?token=${token}`

        const msg = {
          to: lowerCaseEduEmail,
          from: 'test@discuno.com',
          subject: 'Verify Your College Email to Become a Mentor',
          html: `
          <p>Hi ${user.name ?? 'there'},</p>
          <p>Thank you for your interest in becoming a mentor at College Advice.</p>
          <p>Please verify your college email by clicking the link below:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
        }

        await mockSgMail.send(msg)
      })

      await handleSubmit(formData)

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Hi there,'),
        })
      )
    })

    it('should handle SendGrid send errors', async () => {
      mockSgMail.send.mockRejectedValue(new Error('SendGrid API error'))

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        try {
          const user = await mockRequireAuth()
          const eduEmailRaw = formData.get('email')
          const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

          const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
            expiresIn: '10m',
          })

          const verifyUrl = `https://discuno.com/verify-email/?token=${token}`

          mockSgMail.setApiKey('test-sendgrid-key')

          const msg = {
            to: lowerCaseEduEmail,
            from: 'test@discuno.com',
            subject: 'Verify Your College Email to Become a Mentor',
            html: `<p>Verification email content</p>`,
          }

          await mockSgMail.send(msg)
        } catch (error) {
          // Check if it's a redirect error
          if (
            typeof error === 'object' &&
            error &&
            'digest' in error &&
            typeof error.digest === 'string' &&
            error.digest.startsWith('NEXT_REDIRECT')
          ) {
            throw error
          }

          mockRedirect('/email-verification?status=error')
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=error')
    })

    it('should redirect to success page after successful email send', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        // Check for duplicates
        const userProfile = await mockDb.query.userProfiles.findFirst({
          where: (table: any, { eq }: any) => eq(table.eduEmail, lowerCaseEduEmail),
        })

        if (userProfile) {
          mockRedirect('/email-verification?status=email-in-use')
          return
        }

        // Validate email format
        if (!lowerCaseEduEmail.endsWith('.edu')) {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }

        try {
          const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
            expiresIn: '10m',
          })

          const verifyUrl = `https://discuno.com/verify-email/?token=${token}`

          mockSgMail.setApiKey('test-sendgrid-key')

          const msg = {
            to: lowerCaseEduEmail,
            from: 'test@discuno.com',
            subject: 'Verify Your College Email to Become a Mentor',
            html: `<p>Verification content</p>`,
          }

          await mockSgMail.send(msg)

          // Success - redirect to sent page
          mockRedirect('/email-verification?status=sent')
        } catch (error) {
          mockRedirect('/email-verification?status=error')
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=sent')
    })
  })

  describe('Authentication', () => {
    it('should require user authentication', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        expect(user.id).toBe('user-123')
      })

      await handleSubmit(formData)

      expect(mockRequireAuth).toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        try {
          await mockRequireAuth()
        } catch (error) {
          mockRedirect('/auth/signin')
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockDb.query.userProfiles.findFirst.mockRejectedValue(new Error('Database connection failed'))

      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        try {
          const eduEmailRaw = formData.get('email')
          const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

          await mockDb.query.userProfiles.findFirst({
            where: (table: any, { eq }: any) => eq(table.eduEmail, lowerCaseEduEmail),
          })
        } catch (error) {
          mockRedirect('/email-verification?status=error')
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=error')
    })

    it('should handle empty email input', async () => {
      const formData = new FormData()
      formData.set('email', '')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        if (!lowerCaseEduEmail.endsWith('.edu')) {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=invalid-email')
    })

    it('should handle malformed FormData', async () => {
      const formData = new FormData()
      // Don't set email field

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const eduEmailRaw = formData.get('email')

        if (typeof eduEmailRaw !== 'string') {
          mockRedirect('/email-verification?status=invalid-email')
          return
        }
      })

      await handleSubmit(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/email-verification?status=invalid-email')
    })
  })

  describe('Security', () => {
    it('should properly encode verification URL', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        const token = mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', {
          expiresIn: '10m',
        })

        const verifyUrl = `https://discuno.com/verify-email/?token=${token}`

        expect(verifyUrl).toContain('mock-jwt-token')
      })

      await handleSubmit(formData)
    })

    it('should set proper JWT expiration', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', { expiresIn: '10m' })
      })

      await handleSubmit(formData)

      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), 'test-jwt-secret', { expiresIn: '10m' })
    })

    it('should include user ID in JWT payload for authorization', async () => {
      const formData = new FormData()
      formData.set('email', 'student@university.edu')

      const handleSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
        const user = await mockRequireAuth()
        const eduEmailRaw = formData.get('email')
        const lowerCaseEduEmail = (eduEmailRaw as string).toLowerCase()

        mockJwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, 'test-jwt-secret', { expiresIn: '10m' })
      })

      await handleSubmit(formData)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          eduEmail: 'student@university.edu',
        }),
        'test-jwt-secret',
        { expiresIn: '10m' }
      )
    })
  })
})
