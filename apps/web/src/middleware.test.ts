import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Mock NextResponse methods
const mockRedirect = vi.fn()
const mockNext = vi.fn()

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
  },
}))

// Mock the auth function to return a middleware function
vi.mock('~/server/auth', () => ({
  auth: vi.fn(callback => callback),
}))

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to create mock request
  const createMockRequest = (pathname: string, auth: any = null) =>
    ({
      nextUrl: { pathname },
      url: `http://localhost:3000${pathname}`,
      auth,
    }) as unknown as NextRequest

  it('should redirect authenticated users from /auth to home', async () => {
    const { default: middleware } = await import('./middleware')
    const req = createMockRequest('/auth', { user: { id: 'test-user' } })

    middleware(req, {} as any)

    expect(mockRedirect).toHaveBeenCalledWith(new URL('/', req.url))
  })

  it('should allow unauthenticated users to access /auth', async () => {
    const { default: middleware } = await import('./middleware')
    const req = createMockRequest('/auth', null)

    middleware(req, {} as any)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('should allow access to public paths without authentication', async () => {
    const { default: middleware } = await import('./middleware')
    const publicPaths = [
      '/auth',
      '/mentor',
      '/auth/signin',
      '/auth/signup',
      '/api/auth/signin',
      '/pricing',
    ]

    for (const path of publicPaths) {
      const req = createMockRequest(path, null)
      middleware(req, {} as any)
      expect(mockNext).toHaveBeenCalled()
    }
  })

  it('should redirect unauthenticated users from protected routes to /auth', async () => {
    const { default: middleware } = await import('./middleware')
    const protectedPaths = ['/', '/dashboard', '/profile', '/settings', '/book/someuser']

    for (const path of protectedPaths) {
      vi.clearAllMocks()
      const req = createMockRequest(path, null)
      middleware(req, {} as any)
      expect(mockRedirect).toHaveBeenCalledWith(new URL('/auth', req.url))
    }
  })

  it('should allow authenticated users to access protected routes', async () => {
    const { default: middleware } = await import('./middleware')
    const protectedPaths = ['/', '/dashboard', '/profile', '/settings', '/book/someuser']

    for (const path of protectedPaths) {
      vi.clearAllMocks()
      const req = createMockRequest(path, { user: { id: 'test-user' } })
      middleware(req, {} as any)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
    }
  })

  it('should handle paths starting with public prefixes', async () => {
    const { default: middleware } = await import('./middleware')
    const publicPrefixPaths = [
      '/auth/signin',
      '/auth/signup',
      '/auth/callback',
      '/api/auth/signin',
      '/api/auth/callback',
    ]

    for (const path of publicPrefixPaths) {
      vi.clearAllMocks()
      const req = createMockRequest(path, null)
      middleware(req, {} as any)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
    }
  })

  it('should properly identify public vs protected paths', async () => {
    const { default: middleware } = await import('./middleware')

    // Test that the middleware correctly categorizes paths
    const testCases = [
      { path: '/auth', isPublic: true },
      { path: '/mentor', isPublic: true },
      { path: '/pricing', isPublic: true },
      { path: '/auth/signin', isPublic: true },
      { path: '/api/auth/callback', isPublic: true },
      { path: '/', isPublic: false },
      { path: '/dashboard', isPublic: false },
      { path: '/profile', isPublic: false },
      { path: '/api/user', isPublic: false },
      { path: '/book/username', isPublic: false },
    ]

    for (const { path, isPublic } of testCases) {
      vi.clearAllMocks()
      const req = createMockRequest(path, null)
      middleware(req, {} as any)

      if (isPublic) {
        expect(mockNext).toHaveBeenCalled()
        expect(mockRedirect).not.toHaveBeenCalled()
      } else {
        expect(mockRedirect).toHaveBeenCalledWith(new URL('/auth', req.url))
      }
    }
  })
})
