import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock environment
vi.mock('~/env', () => ({
  env: {
    NEXT_PUBLIC_CALCOM_API_URL: 'https://api.cal.com/v2',
    NEXT_PUBLIC_X_CAL_ID: 'test-client-id',
    X_CAL_SECRET_KEY: 'test-secret-key',
  },
}))

// Mock auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
  requireUserId: vi.fn(),
}))

// Mock server queries
vi.mock('~/server/queries', () => ({
  getUserCalcomTokens: vi.fn(),
  getCalcomToken: vi.fn(),
  updateCalcomToken: vi.fn(),
  storeCalcomTokens: vi.fn(),
}))

// Mock database
vi.mock('~/server/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({})),
      })),
    })),
  },
}))

// Mock drizzle operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock database schema
vi.mock('~/server/db/schema', () => ({
  calcomTokens: {},
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Availability Actions', () => {
  let mockRequireAuth: any
  let mockRequireUserId: any
  let mockGetUserCalcomTokens: any
  let mockGetCalcomToken: any
  let mockUpdateCalcomToken: any
  let mockFetch: any
  let mockDb: any

  beforeEach(async () => {
    const authUtils = await import('~/lib/auth/auth-utils')
    mockRequireAuth = authUtils.requireAuth
    mockRequireUserId = authUtils.requireUserId
    const queries = await import('~/server/queries')
    mockGetUserCalcomTokens = queries.getUserCalcomTokens
    mockGetCalcomToken = queries.getCalcomToken
    mockUpdateCalcomToken = queries.updateCalcomToken
    mockDb = (await import('~/server/db')).db
    mockFetch = global.fetch as any

    // Clear all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      expires: '2025-12-31',
    } as any)

    // Default successful userId mock
    mockRequireUserId.mockResolvedValue('user-123')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getCalcomAccessToken', () => {
    it('should return tokens for authenticated user', async () => {
      const { getCalcomAccessToken } = await import('./actions')
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }

      mockGetUserCalcomTokens.mockResolvedValue(mockTokens)

      const result = await getCalcomAccessToken('user-123')

      expect(result.success).toBe(true)
      expect(result.accessToken).toBe('test-access-token')
      expect(result.refreshToken).toBe('test-refresh-token')
      expect(mockGetUserCalcomTokens).toHaveBeenCalledWith('user-123')
    })

    it('should return error when user ID is missing', async () => {
      const { getCalcomAccessToken } = await import('./actions')
      const result = await getCalcomAccessToken('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(mockGetUserCalcomTokens).not.toHaveBeenCalled()
    })

    it('should return error when no tokens found', async () => {
      const { getCalcomAccessToken } = await import('./actions')
      mockGetUserCalcomTokens.mockResolvedValue(null)

      const result = await getCalcomAccessToken('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No Cal.com tokens found')
    })

    it('should handle database errors gracefully', async () => {
      const { getCalcomAccessToken } = await import('./actions')
      mockGetUserCalcomTokens.mockRejectedValue(new Error('Database connection failed'))

      const result = await getCalcomAccessToken('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get token')
    })
  })

  describe('refreshCalcomToken', () => {
    it('should refresh token successfully', async () => {
      const { refreshCalcomToken } = await import('./actions')
      const mockExistingToken = {
        id: 'token-123',
        refreshToken: 'old-refresh-token',
        calcomUserId: 456,
        userId: 'user-123',
        refreshTokenExpiresAt: new Date(Date.now() + 3600000),
      }

      const mockRefreshResponse = {
        status: 'success',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: Date.now() + 3600000,
          refreshTokenExpiresAt: Date.now() + 7200000,
        },
      }

      mockGetCalcomToken.mockResolvedValue(mockExistingToken)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRefreshResponse),
      })
      mockUpdateCalcomToken.mockResolvedValue(undefined)

      const result = await refreshCalcomToken('old-access-token')

      expect(result.success).toBe(true)
      expect(result.accessToken).toBe('new-access-token')

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users/456/refresh-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            refreshToken: 'old-refresh-token',
          }),
        }
      )

      // Verify token was updated in database
      expect(mockUpdateCalcomToken).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: expect.any(Date),
          refreshTokenExpiresAt: expect.any(Date),
        }),
        'user-123'
      )
    })

    it('should return error when access token not found', async () => {
      const { refreshCalcomToken } = await import('./actions')
      mockGetCalcomToken.mockResolvedValue(null)

      const result = await refreshCalcomToken('non-existent-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token not found')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle Cal.com API errors', async () => {
      const { refreshCalcomToken } = await import('./actions')
      const mockExistingToken = {
        id: 'token-123',
        refreshToken: 'old-refresh-token',
        calcomUserId: 456,
      }

      mockGetCalcomToken.mockResolvedValue(mockExistingToken)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const result = await refreshCalcomToken('old-access-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token refresh failed')
      expect(mockUpdateCalcomToken).not.toHaveBeenCalled()
    })

    it('should handle Cal.com API error responses', async () => {
      const { refreshCalcomToken } = await import('./actions')
      const mockExistingToken = {
        id: 'token-123',
        refreshToken: 'old-refresh-token',
        calcomUserId: 456,
      }

      mockGetCalcomToken.mockResolvedValue(mockExistingToken)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: 'Refresh token expired',
          }),
      })

      const result = await refreshCalcomToken('old-access-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token refresh failed')
    })

    it('should handle network errors', async () => {
      const { refreshCalcomToken } = await import('./actions')
      const mockExistingToken = {
        id: 'token-123',
        refreshToken: 'old-refresh-token',
        calcomUserId: 456,
      }

      mockGetCalcomToken.mockResolvedValue(mockExistingToken)
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await refreshCalcomToken('old-access-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token refresh failed')
    })

    it('should handle database update errors', async () => {
      const { refreshCalcomToken } = await import('./actions')
      const mockExistingToken = {
        id: 'token-123',
        refreshToken: 'old-refresh-token',
        calcomUserId: 456,
      }

      const mockRefreshResponse = {
        status: 'success',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: Date.now() + 3600000,
          refreshTokenExpiresAt: Date.now() + 7200000,
        },
      }

      mockGetCalcomToken.mockResolvedValue(mockExistingToken)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRefreshResponse),
      })
      mockUpdateCalcomToken.mockRejectedValue(new Error('Database update failed'))

      const result = await refreshCalcomToken('old-access-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token refresh failed')
    })
  })

  describe('getUserCalcomToken', () => {
    it('should return user Cal.com token', async () => {
      const { getUserCalcomToken } = await import('./actions')
      const mockTokens = {
        accessToken: 'user-access-token',
        refreshToken: 'user-refresh-token',
      }

      mockGetUserCalcomTokens.mockResolvedValue(mockTokens)

      const result = await getUserCalcomToken()

      expect(result.success).toBe(true)
      expect(result.accessToken).toBe('user-access-token')
      expect(result.refreshToken).toBe('user-refresh-token')
    })

    it('should handle authentication errors', async () => {
      const { getUserCalcomToken } = await import('./actions')
      // requireUserId throws NEXT_REDIRECT when auth fails
      mockRequireUserId.mockRejectedValue(new Error('NEXT_REDIRECT'))

      const result = await getUserCalcomToken()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get token')
      expect(mockGetUserCalcomTokens).not.toHaveBeenCalled()
    })

    it('should handle missing tokens', async () => {
      const { getUserCalcomToken } = await import('./actions')
      // Mock getCalcomAccessToken to return no tokens found
      mockGetUserCalcomTokens.mockResolvedValue(null)

      const result = await getUserCalcomToken()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No Cal.com tokens found')
    })
  })

  describe('createCalcomUser', () => {
    it('should create Cal.com user successfully', async () => {
      const { createCalcomUser } = await import('./actions')
      const userData = {
        email: 'test@college.edu',
        name: 'Test User',
        timeZone: 'America/New_York',
      }

      const mockResponse = {
        status: 'success',
        data: {
          user: {
            id: 789,
            username: 'test-user',
            email: 'test@college.edu',
          },
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: Date.now() + 3600000,
          refreshTokenExpiresAt: Date.now() + 7200000,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await createCalcomUser(userData)

      expect(result.success).toBe(true)
      expect(result.calcomUserId).toBe(789)
      expect(result.username).toBe('test-user')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            email: 'test@college.edu',
            name: 'Test User',
            timeZone: 'America/New_York',
            timeFormat: 12,
            weekStart: 'Sunday',
          }),
        }
      )
    })

    it('should handle Cal.com API HTTP errors', async () => {
      const { createCalcomUser } = await import('./actions')
      const userData = {
        email: 'test@college.edu',
        name: 'Test User',
        timeZone: 'America/New_York',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      })

      const result = await createCalcomUser(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cal.com API error: 400')
    })

    it('should handle Cal.com API error responses', async () => {
      const { createCalcomUser } = await import('./actions')
      const userData = {
        email: 'test@college.edu',
        name: 'Test User',
        timeZone: 'America/New_York',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: 'Email already exists',
          }),
      })

      const result = await createCalcomUser(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('should handle network errors', async () => {
      const { createCalcomUser } = await import('./actions')
      const userData = {
        email: 'test@college.edu',
        name: 'Test User',
        timeZone: 'America/New_York',
      }

      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await createCalcomUser(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create Cal.com user')
    })
  })

  describe('updateCalcomUser', () => {
    it('should update Cal.com user successfully', async () => {
      const { updateCalcomUser } = await import('./actions')
      const updateData = {
        calcomUserId: 456,
        name: 'Updated Name',
        email: 'updated@college.edu',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              user: {
                id: 456,
                name: 'Updated Name',
                email: 'updated@college.edu',
              },
            },
          }),
      })

      const result = await updateCalcomUser(updateData)

      expect(result.success).toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users/456',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          },
          body: JSON.stringify({
            name: 'Updated Name',
            email: 'updated@college.edu',
          }),
        }
      )
    })

    it('should handle Cal.com API errors', async () => {
      const { updateCalcomUser } = await import('./actions')
      const updateData = {
        calcomUserId: 456,
        name: 'Updated Name',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: 'User not found',
          }),
      })

      const result = await updateCalcomUser(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle network errors', async () => {
      const { updateCalcomUser } = await import('./actions')
      const updateData = {
        calcomUserId: 456,
        name: 'Updated Name',
      }

      mockFetch.mockRejectedValue(new Error('Connection refused'))

      const result = await updateCalcomUser(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update Cal.com user')
    })
  })

  describe('hasCalcomIntegration', () => {
    it('should return true when user has Cal.com tokens', async () => {
      const { hasCalcomIntegration } = await import('./actions')
      const mockTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
      }

      mockGetUserCalcomTokens.mockResolvedValue(mockTokens)

      const result = await hasCalcomIntegration()

      expect(result).toBe(true)
      expect(mockRequireUserId).toHaveBeenCalled()
      expect(mockGetUserCalcomTokens).toHaveBeenCalledWith('user-123')
    })

    it('should return false when user has no Cal.com tokens', async () => {
      const { hasCalcomIntegration } = await import('./actions')
      mockGetUserCalcomTokens.mockResolvedValue(null)

      const result = await hasCalcomIntegration()

      expect(result).toBe(false)
    })

    it('should return false on authentication error', async () => {
      const { hasCalcomIntegration } = await import('./actions')
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'))

      const result = await hasCalcomIntegration()

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      const { hasCalcomIntegration } = await import('./actions')
      mockGetUserCalcomTokens.mockRejectedValue(new Error('Database error'))

      const result = await hasCalcomIntegration()

      expect(result).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete token refresh workflow', async () => {
      const { getUserCalcomToken } = await import('./actions')

      // Set up successful token retrieval
      const mockTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
      }

      mockGetUserCalcomTokens.mockResolvedValue(mockTokens)

      // Test getting current token
      const currentTokenResult = await getUserCalcomToken()
      expect(currentTokenResult.success).toBe(true)
      expect(currentTokenResult.accessToken).toBe('old-access-token')

      // Mock refresh workflow
      mockGetCalcomToken.mockResolvedValue(mockTokens)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              accessTokenExpiresAt: Date.now() + 3600000,
              refreshTokenExpiresAt: Date.now() + 7200000,
            },
          }),
      })
      mockUpdateCalcomToken.mockResolvedValue(undefined)

      // Test token refresh
      const { refreshCalcomToken } = await import('./actions')
      const refreshResult = await refreshCalcomToken('old-access-token')
      expect(refreshResult.success).toBe(true)
      expect(refreshResult.accessToken).toBe('new-access-token')
    })

    it('should handle complete user creation and token storage workflow', async () => {
      const { createCalcomUser } = await import('./actions')

      const userData = {
        email: 'student@university.edu',
        name: 'Student Name',
        timeZone: 'America/New_York',
      }

      const mockCreationResponse = {
        status: 'success',
        data: {
          user: {
            id: 12345,
            username: 'student-name',
            email: 'student@university.edu',
            name: 'Student Name',
          },
          accessToken: 'fresh-access-token',
          refreshToken: 'fresh-refresh-token',
          accessTokenExpiresAt: Date.now() + 3600000,
          refreshTokenExpiresAt: Date.now() + 7200000,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockCreationResponse),
      })

      const result = await createCalcomUser(userData)

      expect(result.success).toBe(true)
      expect(result.calcomUserId).toBe(12345)
      expect(result.username).toBe('student-name')

      // Verify the complete API call structure
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/oauth-clients/test-client-id/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-cal-secret-key': 'test-secret-key',
          }),
          body: JSON.stringify({
            email: 'student@university.edu',
            name: 'Student Name',
            timeZone: 'America/New_York',
            timeFormat: 12,
            weekStart: 'Sunday',
          }),
        })
      )
    })
  })
})
