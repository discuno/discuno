import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the scheduling actions
vi.mock('~/app/(default)/(dashboard)/scheduling/actions', () => ({
  refreshCalcomToken: vi.fn(),
}))

import { refreshCalcomToken } from '~/app/(default)/(dashboard)/scheduling/actions'
import { GET } from './route'

describe('Cal.com Refresh API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should reject requests without Authorization header', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh')

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Missing or invalid Authorization header')
      expect(vi.mocked(refreshCalcomToken)).not.toHaveBeenCalled()
    })

    it('should reject requests with invalid Authorization header format', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Invalid token-format',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Missing or invalid Authorization header')
      expect(vi.mocked(refreshCalcomToken)).not.toHaveBeenCalled()
    })

    it('should reject requests without Bearer prefix', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'token-without-bearer-prefix',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Missing or invalid Authorization header')
    })

    it('should accept valid Bearer token format', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-access-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-access-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith('valid-access-token')
    })
  })

  describe('Token Extraction Security', () => {
    it('should properly extract token from Bearer header', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer access-token-123',
        },
      })

      await GET(request)

      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith('access-token-123')
    })

    it('should handle tokens with special characters', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const specialToken = 'token_with-special.chars+symbols/='
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: `Bearer ${specialToken}`,
        },
      })

      await GET(request)

      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith(specialToken)
    })

    it('should handle empty Bearer token', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer ',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401) // Empty token should be rejected
      expect(vi.mocked(refreshCalcomToken)).not.toHaveBeenCalled()
    })
  })

  describe('Response Handling', () => {
    it('should return new access token on successful refresh', async () => {
      const newAccessToken = 'fresh-access-token-12345'
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: newAccessToken,
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer old-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.accessToken).toBe(newAccessToken)
    })

    it('should return 500 error on refresh failure', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Invalid refresh token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer expired-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Invalid refresh token')
    })

    it('should return proper content-type headers', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Error Handling and Security', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(refreshCalcomToken).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should not leak sensitive information in error responses', async () => {
      vi.mocked(refreshCalcomToken).mockRejectedValue(new Error('Database password: secret123'))

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error') // Should not leak sensitive info
      expect(data.error).not.toContain('secret123')
    })

    it('should handle malformed JSON responses from Cal.com', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Malformed response from Cal.com',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Malformed response from Cal.com')
    })

    it('should validate token format before processing', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(vi.mocked(refreshCalcomToken)).not.toHaveBeenCalled()
    })

    it('should handle very long tokens safely', async () => {
      const veryLongToken = 'a'.repeat(10000) // 10KB token
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: `Bearer ${veryLongToken}`,
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledWith(veryLongToken)
    })
  })

  describe('Rate Limiting and Performance', () => {
    it('should handle concurrent requests safely', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'concurrent-token',
      })

      const requests = Array.from({ length: 5 }, (_, i) =>
        GET(
          new NextRequest('http://localhost/api/auth/calcom/refresh', {
            headers: {
              Authorization: `Bearer token-${i}`,
            },
          })
        )
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      expect(vi.mocked(refreshCalcomToken)).toHaveBeenCalledTimes(5)
    })

    it('should respond quickly to invalid requests', async () => {
      const startTime = Date.now()

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh')
      const response = await GET(request)

      const duration = Date.now() - startTime

      expect(response.status).toBe(401)
      expect(duration).toBeLessThan(100) // Should respond in under 100ms
    })
  })

  describe('API Contract Validation', () => {
    it('should maintain consistent response format for success', async () => {
      vi.mocked(refreshCalcomToken).mockResolvedValue({
        success: true,
        accessToken: 'test-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('accessToken')
      expect(typeof data.accessToken).toBe('string')
      expect(data.accessToken.length).toBeGreaterThan(0)
    })

    it('should maintain consistent response format for errors', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)
    })

    it('should handle edge case with whitespace-only token', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer    ', // Multiple spaces
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(vi.mocked(refreshCalcomToken)).not.toHaveBeenCalled()
    })
  })
})
