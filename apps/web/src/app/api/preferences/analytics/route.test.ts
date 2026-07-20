import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  getPreference: vi.fn(),
  updatePreference: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({ getAuthSession: mocks.getAuthSession }))
vi.mock('~/server/dal/analytics-preferences', () => ({
  getUserAnalyticsPreference: mocks.getPreference,
  updateUserAnalyticsPreference: mocks.updatePreference,
}))

import { GET, PATCH } from './route'

describe('analytics preference API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      session: { userId: 'temporary-user' },
      user: { id: 'temporary-user', isAnonymous: true },
    })
    mocks.getPreference.mockResolvedValue(null)
    mocks.updatePreference.mockResolvedValue(false)
  })

  it('exposes an unset preference for an authenticated temporary user', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    await expect(response.json()).resolves.toEqual({ analyticsEnabled: null })
    expect(mocks.getPreference).toHaveBeenCalledWith('temporary-user')
  })

  it('uses browser-only behavior when no session exists', async () => {
    mocks.getAuthSession.mockResolvedValue(null)

    const response = await GET()

    await expect(response.json()).resolves.toEqual({ analyticsEnabled: null })
    expect(mocks.getPreference).not.toHaveBeenCalled()
  })

  it('persists a temporary user opt-out', async () => {
    const response = await PATCH(
      new Request('https://discuno.test/api/preferences/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsEnabled: false }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.updatePreference).toHaveBeenCalledWith('temporary-user', false)
    await expect(response.json()).resolves.toEqual({ analyticsEnabled: false })
  })

  it('rejects unauthenticated updates without writing', async () => {
    mocks.getAuthSession.mockResolvedValue(null)

    const response = await PATCH(
      new Request('https://discuno.test/api/preferences/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsEnabled: false }),
      })
    )

    expect(response.status).toBe(401)
    expect(mocks.updatePreference).not.toHaveBeenCalled()
  })

  it('requires a boolean JSON preference', async () => {
    const response = await PATCH(
      new Request('https://discuno.test/api/preferences/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticsEnabled: 'no' }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.updatePreference).not.toHaveBeenCalled()
  })
})
