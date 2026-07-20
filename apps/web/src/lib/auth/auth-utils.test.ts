import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  userHasPermission: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ cookie: 'session=test' })),
}))

vi.mock('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
      userHasPermission: mocks.userHasPermission,
    },
  },
}))

import {
  getAuthSession,
  hasPermission,
  isSessionFresh,
  requireFreshAuth,
  requireFreshPermission,
  requirePermission,
} from './auth-utils'

const authResult = {
  session: { userId: 'user-1', createdAt: new Date() },
  user: { id: 'user-1', role: 'mentor', isAnonymous: false },
}

describe('auth session cache boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue(authResult)
    mocks.userHasPermission.mockResolvedValue({ success: true })
  })

  it('uses the short-lived cookie cache for ordinary optional auth reads', async () => {
    await expect(getAuthSession()).resolves.toEqual(authResult)
    expect(mocks.getSession).toHaveBeenCalledWith(expect.objectContaining({ query: undefined }))
  })

  it('bypasses cookie cache at the permission security boundary', async () => {
    await expect(requirePermission({ mentor: ['manage'] })).resolves.toEqual(authResult)
    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  })

  it('uses Better Auth exact freshness boundary', () => {
    const now = Date.parse('2026-07-14T12:15:00.000Z')
    const session = { createdAt: new Date('2026-07-14T12:00:00.000Z') }

    expect(isSessionFresh(session, { now: now - 1 })).toBe(true)
    expect(isSessionFresh(session, { now })).toBe(false)
    expect(isSessionFresh(session, { now, freshAgeSeconds: 0 })).toBe(true)
  })

  it('rejects a stale session with Better Auth-compatible error semantics', async () => {
    mocks.getSession.mockResolvedValue({
      ...authResult,
      session: {
        ...authResult.session,
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      },
    })

    await expect(requireFreshAuth()).rejects.toMatchObject({
      code: 'SESSION_NOT_FRESH',
      message: 'Session is not fresh',
      statusCode: 403,
    })
    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  })

  it('combines the existing ACL check with session freshness', async () => {
    await expect(requireFreshPermission({ mentor: ['manage'] })).resolves.toEqual(authResult)
    expect(mocks.userHasPermission).toHaveBeenCalledWith({
      body: {
        userId: 'user-1',
        permissions: { mentor: ['manage'] },
      },
    })
  })

  it('never grants application permissions to an anonymous session', async () => {
    mocks.getSession.mockResolvedValueOnce({
      ...authResult,
      user: { ...authResult.user, isAnonymous: true },
    })

    await expect(hasPermission({ content: ['read'] })).resolves.toBe(false)
    expect(mocks.userHasPermission).not.toHaveBeenCalled()
    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  })
})
