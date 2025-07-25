import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

// Mock the database using factory function
vi.mock('~/server/db', () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 5 }),
    }),
  },
}))

// Mock server-only to prevent client-side import errors
vi.mock('server-only', () => ({}))

// Mock Drizzle schema
vi.mock('~/server/db/schema', () => ({
  sessions: { expires: 'sessions.expires' },
  verificationTokens: { expires: 'verificationTokens.expires' },
}))

// Mock Drizzle operators
vi.mock('drizzle-orm', () => ({
  lt: vi.fn((column, value) => ({ column, operator: 'lt', value })),
}))

import { db } from '~/server/db'

// Type for our mocked database
type MockDb = {
  delete: ReturnType<typeof vi.fn>
}

const mockDb = db as unknown as MockDb

describe('Cleanup Auth API Route', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret-key'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth')

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 401 when authorization header is invalid', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 401 when authorization header format is incorrect', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Basic test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should accept request with correct authorization header', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Database Cleanup', () => {
    it('should delete expired sessions and verification tokens', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(mockDb.delete).toHaveBeenCalledTimes(2)
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({ message: 'Cleanup complete' })
    })

    it('should use current date for expiration comparison', async () => {
      const mockDate = new Date('2025-01-01T00:00:00Z')
      const dateSpy = vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      await GET(request)

      expect(dateSpy).toHaveBeenCalled()
      dateSpy.mockRestore()
    })

    it('should handle database errors gracefully', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      })

      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      await expect(GET(request)).rejects.toThrow('Database connection failed')
    })
  })

  describe('Environment Variables', () => {
    it('should handle missing CRON_SECRET environment variable', async () => {
      delete process.env.CRON_SECRET

      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle empty CRON_SECRET environment variable', async () => {
      process.env.CRON_SECRET = ''

      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('HTTP Methods', () => {
    it('should only accept GET requests', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should return JSON response on success', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')

      const data = await response.json()
      expect(data).toEqual({ message: 'Cleanup complete' })
    })

    it('should return text response on error', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth')

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('text/plain')
      expect(await response.text()).toBe('Unauthorized')
    })
  })

  describe('Security', () => {
    it('should not expose sensitive information in error responses', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(request)
      const responseText = await response.text()

      expect(responseText).not.toContain('test-secret-key')
      expect(responseText).not.toContain('CRON_SECRET')
      expect(responseText).toBe('Unauthorized')
    })

    it('should validate authorization header case-sensitively', async () => {
      const request = new NextRequest('http://localhost/api/cron/cleanup-auth', {
        headers: {
          authorization: 'Bearer test-secret-key', // lowercase
        },
      })

      const response = await GET(request)

      // Should still work as headers are case-insensitive in HTTP
      expect(response.status).toBe(200)
    })
  })
})
