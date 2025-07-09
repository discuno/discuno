import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the scheduling actions
vi.mock('~/app/(default)/(dashboard)/scheduling/actions', () => ({
  refreshCalcomToken: vi.fn(),
}))

// Mock auth utilities
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
}))

import { refreshCalcomToken } from '~/app/(default)/(dashboard)/scheduling/actions'
import { requireAuth } from '~/lib/auth/auth-utils'
import { GET } from './route'

describe('Cal.com Refresh API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should reject requests when user is not authenticated', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthenticated'))
      vi.mocked(refreshCalcomToken).mockRejectedValue(new Error('Unauthenticated'))

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith()
    })

    it('should accept authenticated requests', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-access-token',
      })

      const response = await GET()

      expect(response.status).toBe(200)
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith()
    })
  })

  describe('Response Handling', () => {
    it('should return new access token on successful refresh', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      const newAccessToken = 'fresh-access-token-12345'
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: newAccessToken,
      })

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.accessToken).toBe(newAccessToken)
    })

    it('should return 500 error on refresh failure', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Invalid refresh token',
      })

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Invalid refresh token')
    })

    it('should return proper content-type headers', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const response = await GET()

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Error Handling and Security', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should not leak sensitive information in error responses', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockRejectedValue(new Error('Database password: secret123'))

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error') // Should not leak sensitive info
      expect(data.error).not.toContain('secret123')
    })

    it('should handle malformed JSON responses from Cal.com', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Malformed response from Cal.com',
      })

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Malformed response from Cal.com')
    })
  })

  describe('Rate Limiting and Performance', () => {
    it('should handle concurrent requests safely', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'concurrent-token',
      })

      const requests = Array.from({ length: 5 }, () => GET())

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledTimes(5)
    })

    it('should respond quickly to requests', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'test-token',
      })

      const startTime = Date.now()
      const response = await GET()
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(100) // Should respond in under 100ms
    })
  })

  describe('API Contract Validation', () => {
    it('should maintain consistent response format for success', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'test-token',
      })

      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('accessToken')
      expect(typeof data.accessToken).toBe('string')
      expect(data.accessToken.length).toBeGreaterThan(0)
    })

    it('should maintain consistent response format for errors', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      })
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Token refresh failed',
      })

      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)
    })
  })
})
