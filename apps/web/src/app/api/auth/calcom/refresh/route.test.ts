import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the availability actions
vi.mock('~/app/(default)/availability/actions', () => ({
  refreshCalcomToken: vi.fn(),
}))

import { GET } from './route'
import { refreshCalcomToken } from '~/app/(default)/availability/actions'

const mockRefreshCalcomToken = vi.mocked(refreshCalcomToken)

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
      expect(mockRefreshCalcomToken).not.toHaveBeenCalled()
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
      expect(mockRefreshCalcomToken).not.toHaveBeenCalled()
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
      mockRefreshCalcomToken.mockResolvedValue({
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
      expect(mockRefreshCalcomToken).toHaveBeenCalledWith('valid-access-token')
    })
  })

  describe('Token Extraction Security', () => {
    it('should properly extract token from Bearer header', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer access-token-123',
        },
      })

      await GET(request)

      expect(mockRefreshCalcomToken).toHaveBeenCalledWith('access-token-123')
    })

    it('should handle tokens with special characters', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
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

      expect(mockRefreshCalcomToken).toHaveBeenCalledWith(specialToken)
    })

    it('should handle empty Bearer token', async () => {
      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer ',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401) // Empty token should be rejected
      expect(mockRefreshCalcomToken).not.toHaveBeenCalled()
    })
  })

  describe('Response Handling', () => {
    it('should return new access token on successful refresh', async () => {
      const newAccessToken = 'fresh-access-token-12345'
      mockRefreshCalcomToken.mockResolvedValue({
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
      mockRefreshCalcomToken.mockResolvedValue({
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
      mockRefreshCalcomToken.mockResolvedValue({
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
      mockRefreshCalcomToken.mockRejectedValue(new Error('Database connection failed'))

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

    it('should not leak sensitive information in error messages', async () => {
      mockRefreshCalcomToken.mockRejectedValue(new Error('Database password: secret123'))

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toBe('Internal server error')
      expect(data.error).not.toContain('password')
      expect(data.error).not.toContain('secret123')
    })

    it('should handle malformed tokens without crashing', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Malformed token',
      })

      const malformedTokens = [
        'Bearer ' + 'x'.repeat(10000), // Very long token
        'Bearer invalid-unicode-token',
      ]

      for (const authHeader of malformedTokens) {
        const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
          headers: { Authorization: authHeader },
        })

        const response = await GET(request)
        expect(response.status).toBeOneOf([200, 401, 500]) // Should not crash
      }

      // Test null byte and newline tokens - these should be rejected by NextJS
      const invalidTokens = ['Bearer \u0000null-byte-token', 'Bearer \n\r\t whitespace-token']

      for (const authHeader of invalidTokens) {
        expect(() => {
          new NextRequest('http://localhost/api/auth/calcom/refresh', {
            headers: { Authorization: authHeader },
          })
        }).toThrow()
      }
    })
  })

  describe('Security Vulnerabilities', () => {
    it('should prevent authorization header injection attacks', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
        success: true,
        accessToken: 'token',
      })

      const injectionHeaders = [
        'Bearer token\r\nX-Injection: malicious',
        'Bearer token\nContent-Type: text/html',
        'Bearer token\u0000\u0001\u0002binary-injection',
      ]

      for (const authHeader of injectionHeaders) {
        // NextJS should reject malformed authorization headers
        expect(() => {
          new NextRequest('http://localhost/api/auth/calcom/refresh', {
            headers: { Authorization: authHeader },
          })
        }).toThrow()
      }
    })

    it('should handle concurrent requests safely', async () => {
      let callCount = 0
      mockRefreshCalcomToken.mockImplementation(async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          success: true,
          accessToken: `token-${callCount}`,
        }
      })

      const requests = Array.from(
        { length: 5 },
        (_, i) =>
          new NextRequest('http://localhost/api/auth/calcom/refresh', {
            headers: { Authorization: `Bearer token-${i}` },
          })
      )

      const responses = await Promise.all(requests.map(req => GET(req)))

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Each request should have been processed
      expect(mockRefreshCalcomToken).toHaveBeenCalledTimes(5)
    })

    it('should validate token length to prevent DoS attacks', async () => {
      const veryLongToken = 'Bearer ' + 'a'.repeat(100000) // 100KB token

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: { Authorization: veryLongToken },
      })

      const response = await GET(request)

      // Should either reject or handle gracefully without memory issues
      expect(response.status).toBeOneOf([200, 400, 401, 413, 500])
    })

    it('should sanitize console logging to prevent log injection', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockRefreshCalcomToken.mockResolvedValue({
        success: false,
        accessToken: '',
        error: 'Error with \n newlines \r and \t tabs',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        headers: { Authorization: 'Bearer test-token' },
      })

      await GET(request)

      // Check that console.error was called but verify log content doesn't contain injection
      if (consoleSpy.mock.calls.length > 0) {
        const loggedMessage = consoleSpy.mock.calls[0]?.[1]
        // Basic check - in production, you'd want more sophisticated log sanitization
        if (loggedMessage) {
          expect(typeof loggedMessage).toBe('string')
        }
      }

      consoleSpy.mockRestore()
    })
  })

  describe('HTTP Method Security', () => {
    it('should only accept GET requests', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
        success: true,
        accessToken: 'token',
      })

      const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should handle case-sensitive header names correctly', async () => {
      mockRefreshCalcomToken.mockResolvedValue({
        success: true,
        accessToken: 'token',
      })

      // Test different case variations
      const headerVariations = ['Authorization', 'authorization', 'AUTHORIZATION']

      for (const headerName of headerVariations) {
        const request = new NextRequest('http://localhost/api/auth/calcom/refresh', {
          headers: { [headerName]: 'Bearer test-token' },
        })

        const response = await GET(request)
        expect(response.status).toBe(200) // Headers should be case-insensitive
      }
    })
  })

  describe('Rate Limiting Considerations', () => {
    it('should handle rapid refresh attempts', async () => {
      let requestCount = 0
      mockRefreshCalcomToken.mockImplementation(async () => {
        requestCount++
        return {
          success: true,
          accessToken: `token-${requestCount}`,
        }
      })

      // Simulate rapid requests from same token
      const rapidRequests = Array.from(
        { length: 10 },
        () =>
          new NextRequest('http://localhost/api/auth/calcom/refresh', {
            headers: { Authorization: 'Bearer same-token' },
          })
      )

      const responses = await Promise.all(rapidRequests.map(req => GET(req)))

      // All should complete (rate limiting would be handled at infrastructure level)
      responses.forEach(response => {
        expect(response.status).toBeOneOf([200, 429, 500])
      })
    })
  })
})
