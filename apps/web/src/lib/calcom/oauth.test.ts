import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    CALCOM_API_URL: 'https://api.cal.test/v2/',
    CALCOM_APP_URL: 'https://app.cal.test',
    CALCOM_OAUTH_CLIENT_ID: 'oauth-client-id',
    CALCOM_OAUTH_CLIENT_SECRET: 'current-client-secret',
    CALCOM_OAUTH_CLIENT_SECRET_FALLBACK: 'previous-client-secret',
    CALCOM_OAUTH_REDIRECT_URI: 'https://discuno.test/api/integrations/calcom/callback',
  },
}))

vi.mock('~/env', () => ({ env: mocks.env }))

import {
  buildCalcomAuthorizationUrl,
  CALCOM_OAUTH_SCOPES,
  CalcomOAuthTokenError,
  exchangeCalcomAuthorizationCode,
  getCalcomOAuthProfile,
  hasRequiredCalcomOAuthScopes,
  refreshCalcomOAuthTokens,
} from '~/lib/calcom/oauth'

const oauthTokenResponse = (overrides: Record<string, unknown> = {}) => ({
  access_token: 'cal-access-token',
  refresh_token: 'cal-refresh-token',
  token_type: 'bearer',
  expires_in: 1_800,
  scope: CALCOM_OAUTH_SCOPES.join(' '),
  ...overrides,
})

const getFetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

const parseJsonBody = (body: BodyInit | null | undefined): unknown => {
  if (typeof body !== 'string') throw new TypeError('Expected a JSON string request body')
  return JSON.parse(body) as unknown
}

describe('Cal.com standard OAuth', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    mocks.env.CALCOM_OAUTH_CLIENT_SECRET = 'current-client-secret'
    mocks.env.CALCOM_OAUTH_CLIENT_SECRET_FALLBACK = 'previous-client-secret'
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('builds an authorization URL with state and only the scopes Discuno uses', () => {
    const url = buildCalcomAuthorizationUrl('csrf-state-value')

    expect(url.origin).toBe('https://app.cal.test')
    expect(url.pathname).toBe('/auth/oauth2/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'oauth-client-id',
      redirect_uri: 'https://discuno.test/api/integrations/calcom/callback',
      state: 'csrf-state-value',
      scope: CALCOM_OAUTH_SCOPES.join(' '),
    })
    expect(CALCOM_OAUTH_SCOPES).toEqual([
      'PROFILE_READ',
      'EVENT_TYPE_READ',
      'BOOKING_READ',
      'BOOKING_WRITE',
      'SCHEDULE_READ',
      'SCHEDULE_WRITE',
      'WEBHOOK_READ',
      'WEBHOOK_WRITE',
    ])
    expect(url.toString()).not.toContain('current-client-secret')
  })

  it('accepts space/comma-delimited scopes and rejects an incomplete grant', () => {
    expect(hasRequiredCalcomOAuthScopes([...CALCOM_OAUTH_SCOPES].reverse().join(', '))).toBe(true)
    expect(
      hasRequiredCalcomOAuthScopes(
        CALCOM_OAUTH_SCOPES.filter(scope => scope !== 'WEBHOOK_WRITE').join(' ')
      )
    ).toBe(false)
  })

  it('exchanges an authorization code as a confidential client', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(oauthTokenResponse()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(exchangeCalcomAuthorizationCode('one-time-code')).resolves.toEqual(
      oauthTokenResponse()
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(getFetchUrl(url)).toBe('https://api.cal.test/v2/auth/oauth2/token')
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
    expect(parseJsonBody(init?.body)).toEqual({
      client_id: 'oauth-client-id',
      client_secret: 'current-client-secret',
      grant_type: 'authorization_code',
      code: 'one-time-code',
      redirect_uri: 'https://discuno.test/api/integrations/calcom/callback',
    })
    expect(getFetchUrl(url)).not.toContain('one-time-code')
    expect(getFetchUrl(url)).not.toContain('current-client-secret')
  })

  it('uses the rotation fallback only when Cal.com rejects the current client secret', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'invalid_client',
            error_description: 'invalid_client_credentials',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(oauthTokenResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

    await expect(refreshCalcomOAuthTokens('refresh-token')).resolves.toEqual(oauthTokenResponse())

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(parseJsonBody(fetchMock.mock.calls[0]?.[1]?.body)).toEqual({
      client_id: 'oauth-client-id',
      client_secret: 'current-client-secret',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-token',
    })
    expect(parseJsonBody(fetchMock.mock.calls[1]?.[1]?.body)).toEqual({
      client_id: 'oauth-client-id',
      client_secret: 'previous-client-secret',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-token',
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('does not retry a fallback secret for a rejected authorization grant', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'one-time-code is invalid',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )

    let failure: unknown
    try {
      await exchangeCalcomAuthorizationCode('one-time-code')
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(CalcomOAuthTokenError)
    expect((failure as CalcomOAuthTokenError).oauthErrorCode).toBe('invalid_grant')
    expect((failure as Error).message).toBe('Cal.com authorization could not be completed')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith('Cal.com OAuth token exchange failed', {
      status: 400,
      error: 'invalid_grant',
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain('one-time-code')
    expect(logged).not.toContain('current-client-secret')
  })

  it('turns a malformed successful token response into a redacted provider error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'should-not-leak' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(exchangeCalcomAuthorizationCode('one-time-code')).rejects.toThrow(
      'Cal.com authorization could not be completed'
    )
    expect(console.error).toHaveBeenCalledWith(
      'Cal.com OAuth token exchange returned an invalid response',
      { status: 200 }
    )
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('should-not-leak')
  })

  it('verifies the connected profile with a bearer header and no token in the URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            id: 42,
            username: 'mentor',
            email: 'mentor@example.edu',
            name: 'Mentor',
            timeZone: 'America/New_York',
            defaultScheduleId: 7,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(getCalcomOAuthProfile('profile-access-token')).resolves.toEqual({
      id: 42,
      username: 'mentor',
      email: 'mentor@example.edu',
      name: 'Mentor',
      timeZone: 'America/New_York',
      defaultScheduleId: 7,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(getFetchUrl(url)).toBe('https://api.cal.test/v2/me')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer profile-access-token')
    expect(getFetchUrl(url)).not.toContain('profile-access-token')
  })

  it('does not expose the access token or provider body when profile verification fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('profile-access-token and private profile details', { status: 401 })
    )

    await expect(getCalcomOAuthProfile('profile-access-token')).rejects.toThrow(
      'Cal.com account verification failed'
    )
    expect(console.error).toHaveBeenCalledWith('Cal.com OAuth profile verification failed', {
      status: 401,
    })
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'profile-access-token'
    )
  })
})
