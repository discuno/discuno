import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server-only to prevent client-side import errors
vi.mock('server-only', () => ({}))

// Mock the server auth module using factory function
vi.mock('~/server/auth', () => ({
  auth: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { redirect } from 'next/navigation'
import { auth } from '~/server/auth'
import { requireAuth } from './auth-utils'

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return session when authenticated', async () => {
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2025-12-31',
    }

    mockAuth.mockResolvedValue(mockSession as any)

    const result = await requireAuth()
    // Should return the user object with guaranteed id
    expect(result).toEqual({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    })
  })

  it('should throw UnauthenticatedError when no session exists', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(requireAuth()).rejects.toThrow('Not authenticated')
  })

  it('should throw UnauthenticatedError when session exists but user is null', async () => {
    const mockSession = {
      user: null,
      expires: '2025-12-31',
    }

    mockAuth.mockResolvedValue(mockSession as any)

    await expect(requireAuth()).rejects.toThrow('Not authenticated')
  })

  it('should throw UnauthenticatedError when user exists but no id', async () => {
    const mockSession = {
      user: {
        id: null,
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2025-12-31',
    }

    mockAuth.mockResolvedValue(mockSession as any)

    await expect(requireAuth()).rejects.toThrow('Not authenticated')
  })

  it('should throw UnauthenticatedError when user id is empty string', async () => {
    const mockSession = {
      user: {
        id: '',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2025-12-31',
    }

    mockAuth.mockResolvedValue(mockSession as any)

    await expect(requireAuth()).rejects.toThrow('Not authenticated')
  })

  it('should throw UnauthenticatedError when auth function throws error', async () => {
    // When auth() throws an error, requireAuth should also throw
    mockAuth.mockRejectedValue(new Error('Database connection failed'))

    await expect(requireAuth()).rejects.toThrow('Database connection failed')
  })
})
