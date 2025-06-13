import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only to prevent client-side import errors
vi.mock('server-only', () => ({}))

// Mock the server auth module using factory function
vi.mock('~/server/auth', () => ({
  auth: vi.fn(),
}))

import { requireAuth } from './auth-utils'
import { auth } from '~/server/auth'

const mockAuth = vi.mocked(auth)

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user when authenticated', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    }

    mockAuth.mockResolvedValue({
      user: mockUser,
      expires: '2025-12-31',
    } as any)

    const result = await requireAuth()
    expect(result).toEqual(mockUser)
  })

  it('should throw error when no session exists', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('should throw error when session exists but no user', async () => {
    mockAuth.mockResolvedValue({
      user: null,
      expires: '2025-12-31',
    } as any)

    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('should throw error when user exists but no id', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: null,
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2025-12-31',
    } as any)

    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('should throw error when user id is empty string', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: '',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2025-12-31',
    } as any)

    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('should handle auth function throwing error', async () => {
    mockAuth.mockRejectedValue(new Error('Database connection failed'))

    await expect(requireAuth()).rejects.toThrow('Database connection failed')
  })
})
