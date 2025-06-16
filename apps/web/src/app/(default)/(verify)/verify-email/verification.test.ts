import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Extend global type to include test functions
declare global {
  var verifyEmailFunction: (token: string) => Promise<any>
}

// Mock server-only module
vi.mock('server-only', () => ({}))

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}))

// Mock environment
vi.mock('~/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    NEXT_PUBLIC_CALCOM_API_URL: 'https://api.cal.com/v2',
    NEXT_PUBLIC_X_CAL_ID: 'test-client-id',
    X_CAL_SECRET_KEY: 'test-secret-key',
  },
}))

// Mock auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
  requireUserId: vi.fn(),
  getCurrentSession: vi.fn(),
  isAuthenticated: vi.fn(),
  redirectIfAuthenticated: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Mock server queries
vi.mock('~/server/queries', () => ({
  getCalcomUserId: vi.fn(),
  getProfile: vi.fn(),
  getUserName: vi.fn(),
  isEduEmailInUse: vi.fn(),
  updateEduEmail: vi.fn(),
  storeCalcomTokens: vi.fn(),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Email Verification', () => {
  let mockFetch: any
  let mockJwt: any
  let mockRequireAuth: any
  let mockRequireUserId: any
  let mockGetProfile: any
  let mockGetUserName: any
  let mockIsEduEmailInUse: any
  let mockUpdateEduEmail: any
  let mockStoreCalcomTokens: any
  let mockGetCalcomUserId: any

  beforeEach(async () => {
    mockFetch = global.fetch as any
    mockJwt = (await import('jsonwebtoken')).default
    const authUtils = await import('~/lib/auth/auth-utils')
    mockRequireAuth = authUtils.requireAuth
    mockRequireUserId = authUtils.requireUserId
    const queries = await import('~/server/queries')
    mockGetProfile = queries.getProfile
    mockGetUserName = queries.getUserName
    mockIsEduEmailInUse = queries.isEduEmailInUse
    mockUpdateEduEmail = queries.updateEduEmail
    mockStoreCalcomTokens = queries.storeCalcomTokens
    mockGetCalcomUserId = queries.getCalcomUserId

    // Clear all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-123' }, expires: '2025-12-31' })
    mockRequireUserId.mockResolvedValue('user-123')
    mockJwt.verify.mockReturnValue({
      userId: 'user-123',
      eduEmail: 'student@college.edu',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyEmail function', () => {
    beforeEach(async () => {
      // Dynamic import to ensure mocks are in place
      const { verifyEmail } = await import('./verification')
      global.verifyEmailFunction = verifyEmail
    })

    it('should verify email successfully for new user', async () => {
      // Setup mocks for new user verification
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('John Doe')
      mockUpdateEduEmail.mockResolvedValue(undefined)
      mockStoreCalcomTokens.mockResolvedValue(undefined)

      // Mock successful Cal.com API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              user: {
                id: 123,
                username: 'john-doe',
                email: 'student@college.edu',
              },
              accessToken: 'test-access-token',
              refreshToken: 'test-refresh-token',
              accessTokenExpiresAt: Date.now() + 3600000,
              refreshTokenExpiresAt: Date.now() + 7200000,
            },
          }),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Email verified successfully!')

      // Verify JWT was decoded
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-jwt-secret')

      // Verify email availability was checked
      expect(mockIsEduEmailInUse).toHaveBeenCalledWith('student@college.edu')

      // Verify Cal.com user was created
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            email: 'student@college.edu',
            name: 'John Doe',
            timeZone: 'America/New_York',
            timeFormat: 12,
            weekStart: 'Sunday',
          }),
        })
      )

      // Verify tokens were stored
      expect(mockStoreCalcomTokens).toHaveBeenCalledWith({
        userId: 'user-123',
        calcomUserId: 123,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        accessTokenExpiresAt: expect.any(Number),
        refreshTokenExpiresAt: expect.any(Number),
      })

      // Verify email was updated
      expect(mockUpdateEduEmail).toHaveBeenCalledWith('user-123', 'student@college.edu')
    })

    it('should update email for already verified user', async () => {
      // Setup mocks for existing verified user
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: true })
      mockGetCalcomUserId.mockResolvedValue(456)
      mockUpdateEduEmail.mockResolvedValue(undefined)

      // Mock successful Cal.com update response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              user: {
                id: 456,
                email: 'student@college.edu',
              },
            },
          }),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Email updated successfully!')

      // Verify Cal.com user was updated, not created
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users/456',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            email: 'student@college.edu',
          }),
        })
      )

      // Verify tokens were NOT stored (user already exists)
      expect(mockStoreCalcomTokens).not.toHaveBeenCalled()
    })

    it('should reject invalid JWT token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = await global.verifyEmailFunction('invalid-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })

    it('should reject mismatched user ID', async () => {
      mockJwt.verify.mockReturnValue({
        userId: 'different-user-456',
        eduEmail: 'student@college.edu',
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unauthorized. Please try again.')
    })

    it('should reject email already in use', async () => {
      mockIsEduEmailInUse.mockResolvedValue(true)

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Email already in use. Please try again.')
    })

    it('should handle missing user name for new user', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue(null)

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Please set your name in the profile page.')
    })

    it('should handle Cal.com API errors during user creation', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('John Doe')

      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create calcom user. Please try again.')
    })

    it('should handle Cal.com API success:false response', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('John Doe')

      // Mock API error in response body
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: 'Email already exists',
          }),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create calcom user. Please try again.')
    })

    it('should handle missing Cal.com user ID for update', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: true })
      mockGetCalcomUserId.mockResolvedValue(null)

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to get calcom user id. Please try again.')
    })

    it('should handle Cal.com update API errors', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: true })
      mockGetCalcomUserId.mockResolvedValue(456)

      // Mock API error for update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: 'Update failed',
          }),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to update calcom user. Please try again.')
    })

    it('should handle database errors gracefully', async () => {
      mockIsEduEmailInUse.mockRejectedValue(new Error('Database connection failed'))

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })

    it('should handle network errors during Cal.com API calls', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('John Doe')

      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create calcom user. Please try again.')
    })

    it('should handle token storage errors', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('John Doe')
      mockStoreCalcomTokens.mockRejectedValue(new Error('Token storage failed'))

      // Mock successful Cal.com API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              user: { id: 123, username: 'john-doe' },
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              accessTokenExpiresAt: Date.now(),
              refreshTokenExpiresAt: Date.now(),
            },
          }),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })
  })

  describe('Cal.com User Management', () => {
    it('should create Cal.com user with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              user: { id: 123, username: 'test-user' },
              accessToken: 'token',
              refreshToken: 'refresh',
              accessTokenExpiresAt: Date.now(),
              refreshTokenExpiresAt: Date.now(),
            },
          }),
      })

      // Import and test createCalcomUser indirectly through verifyEmail
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('Test User')
      mockUpdateEduEmail.mockResolvedValue(undefined)
      mockStoreCalcomTokens.mockResolvedValue(undefined)

      await global.verifyEmailFunction('valid-jwt-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            email: 'student@college.edu',
            name: 'Test User',
            timeZone: 'America/New_York',
            timeFormat: 12,
            weekStart: 'Sunday',
          }),
        })
      )
    })

    it('should update Cal.com user with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: { user: { id: 456 } },
          }),
      })

      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: true })
      mockGetCalcomUserId.mockResolvedValue(456)
      mockUpdateEduEmail.mockResolvedValue(undefined)

      await global.verifyEmailFunction('valid-jwt-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users/456',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            email: 'student@college.edu',
          }),
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle expired JWT tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired')
        error.name = 'TokenExpiredError'
        throw error
      })

      const result = await global.verifyEmailFunction('expired-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })

    it('should handle malformed JWT tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('jwt malformed')
        error.name = 'JsonWebTokenError'
        throw error
      })

      const result = await global.verifyEmailFunction('malformed-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })

    it('should handle empty token', async () => {
      const result = await global.verifyEmailFunction('')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
    })

    it('should handle missing environment variables gracefully', async () => {
      // This would be handled by the env module validation
      // but we can test the behavior when API calls fail
      mockFetch.mockRejectedValue(new Error('ENOTFOUND'))

      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('Test User')

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create calcom user. Please try again.')
    })
  })

  describe('Security', () => {
    it('should validate user authorization before proceeding', async () => {
      mockRequireUserId.mockRejectedValue(new Error('Unauthorized'))

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Verification failed. Please try again.')
      expect(mockRequireUserId).toHaveBeenCalled()
    })

    it('should not proceed if JWT user ID does not match authenticated user', async () => {
      mockJwt.verify.mockReturnValue({
        userId: 'attacker-user-789',
        eduEmail: 'student@college.edu',
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unauthorized. Please try again.')

      // Should not make any API calls
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not update database if Cal.com user creation fails', async () => {
      mockIsEduEmailInUse.mockResolvedValue(false)
      mockGetProfile.mockResolvedValue({ isEduVerified: false })
      mockGetUserName.mockResolvedValue('Test User')

      // Mock Cal.com API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      const result = await global.verifyEmailFunction('valid-jwt-token')

      expect(result.success).toBe(false)

      // Database should not be updated if Cal.com fails
      expect(mockUpdateEduEmail).not.toHaveBeenCalled()
      expect(mockStoreCalcomTokens).not.toHaveBeenCalled()
    })
  })
})
