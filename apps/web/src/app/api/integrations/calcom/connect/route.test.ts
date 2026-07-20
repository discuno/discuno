import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionNotFreshError, UnauthenticatedError, UnauthorizedError } from '~/lib/errors'

const mocks = vi.hoisted(() => ({
  buildCalcomAuthorizationUrl: vi.fn(),
  cookieSet: vi.fn(),
  requireFreshPermission: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) =>
      new Response(null, { status: 307, headers: { location: url.toString() } }),
  },
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requireFreshPermission: mocks.requireFreshPermission,
}))

vi.mock('~/lib/calcom/oauth', () => ({
  buildCalcomAuthorizationUrl: mocks.buildCalcomAuthorizationUrl,
  CALCOM_OAUTH_COOKIE: 'discuno_calcom_oauth',
}))

import { GET } from '~/app/api/integrations/calcom/connect/route'

const createRequest = (url: string) => {
  const nextUrl = new URL(url)
  return { nextUrl, url: nextUrl.toString() } as Parameters<typeof GET>[0]
}

describe('Cal.com connect session freshness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireFreshPermission.mockResolvedValue({ user: { id: 'mentor-user-id' } })
    mocks.buildCalcomAuthorizationUrl.mockReturnValue(new URL('https://app.cal.test/oauth'))
  })

  it('redirects a stale session through reauthentication and preserves the settings return path', async () => {
    mocks.requireFreshPermission.mockRejectedValue(new SessionNotFreshError())

    const response = await GET(
      createRequest(
        'https://discuno.test/api/integrations/calcom/connect?returnTo=/settings/calendar'
      )
    )
    const locationHeader = response.headers.get('location')
    if (!locationHeader) throw new Error('Expected a reauthentication redirect')
    const location = new URL(locationHeader)

    expect(location.origin).toBe('https://discuno.test')
    expect(location.pathname).toBe('/auth')
    expect(Object.fromEntries(location.searchParams)).toEqual({
      intent: 'mentor',
      reauth: '1',
      returnTo: '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar',
    })
    expect(mocks.cookieSet).not.toHaveBeenCalled()
    expect(mocks.buildCalcomAuthorizationUrl).not.toHaveBeenCalled()
  })

  it('starts normal mentor sign-in for an unauthenticated visitor and resumes Cal.com setup', async () => {
    mocks.requireFreshPermission.mockRejectedValue(new UnauthenticatedError())

    const response = await GET(
      createRequest(
        'https://discuno.test/api/integrations/calcom/connect?returnTo=/settings/calendar'
      )
    )
    const locationHeader = response.headers.get('location')
    if (!locationHeader) throw new Error('Expected a sign-in redirect')
    const location = new URL(locationHeader)

    expect(location.origin).toBe('https://discuno.test')
    expect(location.pathname).toBe('/auth')
    expect(Object.fromEntries(location.searchParams)).toEqual({
      intent: 'mentor',
      returnTo: '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar',
    })
    expect(mocks.cookieSet).not.toHaveBeenCalled()
    expect(mocks.buildCalcomAuthorizationUrl).not.toHaveBeenCalled()
  })

  it('sends a signed-in user without mentor access to the eligibility explanation', async () => {
    mocks.requireFreshPermission.mockRejectedValue(new UnauthorizedError())

    const response = await GET(
      createRequest(
        'https://discuno.test/api/integrations/calcom/connect?returnTo=/settings/calendar'
      )
    )

    expect(response.headers.get('location')).toBe(
      'https://discuno.test/for-mentors?school-email-required=1'
    )
    expect(mocks.cookieSet).not.toHaveBeenCalled()
    expect(mocks.buildCalcomAuthorizationUrl).not.toHaveBeenCalled()
  })

  it('starts Cal.com authorization immediately for a fresh mentor session', async () => {
    const response = await GET(
      createRequest(
        'https://discuno.test/api/integrations/calcom/connect?returnTo=/settings/calendar'
      )
    )

    expect(response.headers.get('location')).toBe('https://app.cal.test/oauth')
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      'discuno_calcom_oauth',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 600 })
    )
  })

  it.each([
    'https://attacker.example/settings/calendar',
    '//attacker.example/settings/calendar',
    '/settings/../../api/auth/sign-out',
    '/settings/%2e%2e/%2e%2e/api/auth/sign-out',
    '/settings/event-types',
  ])('stores only the safe fallback for an invalid return path: %s', async returnTo => {
    await GET(
      createRequest(
        `https://discuno.test/api/integrations/calcom/connect?returnTo=${encodeURIComponent(returnTo)}`
      )
    )

    const encodedCookie = mocks.cookieSet.mock.calls[0]?.[1]
    if (typeof encodedCookie !== 'string') throw new Error('Expected an OAuth cookie')
    expect(JSON.parse(Buffer.from(encodedCookie, 'base64url').toString('utf8'))).toMatchObject({
      returnTo: '/settings',
    })
  })
})
