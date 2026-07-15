import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCalcomAccessToken: vi.fn(),
}))

vi.mock('~/env', () => ({
  env: {
    CALCOM_API_URL: 'https://api.cal.test/v2/',
  },
}))

vi.mock('~/lib/calcom/tokens', () => ({
  getCalcomAccessToken: mocks.getCalcomAccessToken,
}))

import { calcomRequest } from '~/lib/calcom/client'

const getFetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

describe('Cal.com OAuth API client', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    mocks.getCalcomAccessToken.mockReset()
    mocks.getCalcomAccessToken.mockResolvedValue('cal-access-token')
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends the mentor token only in the Authorization header', async () => {
    const callerAbortController = new AbortController()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      calcomRequest('/bookings?status=upcoming', {
        apiVersion: '2026-05-01',
        userId: 'mentor-user-id',
        signal: callerAbortController.signal,
      })
    ).resolves.toEqual({ status: 'success', data: [] })

    expect(mocks.getCalcomAccessToken).toHaveBeenCalledOnce()
    expect(mocks.getCalcomAccessToken).toHaveBeenCalledWith('mentor-user-id')
    const [url, init] = fetchMock.mock.calls[0]!
    const headers = new Headers(init?.headers)
    expect(getFetchUrl(url)).toBe('https://api.cal.test/v2/bookings?status=upcoming')
    expect(headers.get('authorization')).toBe('Bearer cal-access-token')
    expect(headers.get('cal-api-version')).toBe('2026-05-01')
    expect(getFetchUrl(url)).not.toContain('cal-access-token')
    expect(JSON.stringify(init)).not.toContain('mentor-user-id')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(init?.signal).not.toBe(callerAbortController.signal)
    expect(init?.signal?.aborted).toBe(false)
    callerAbortController.abort()
    expect(init?.signal?.aborted).toBe(true)
  })

  it('refreshes once after a 401 and retries the same request with the new token', async () => {
    const onBeforeRequest = vi.fn().mockResolvedValue(undefined)
    mocks.getCalcomAccessToken
      .mockResolvedValueOnce('expired-access-token')
      .mockResolvedValueOnce('fresh-access-token')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', data: { id: 42 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      calcomRequest('/bookings', {
        method: 'POST',
        apiVersion: '2026-02-25',
        userId: 'mentor-user-id',
        body: JSON.stringify({ eventTypeId: 42 }),
        onBeforeRequest,
      })
    ).resolves.toEqual({ status: 'success', data: { id: 42 } })

    expect(mocks.getCalcomAccessToken).toHaveBeenNthCalledWith(1, 'mentor-user-id')
    expect(mocks.getCalcomAccessToken).toHaveBeenNthCalledWith(2, 'mentor-user-id', {
      forceRefresh: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onBeforeRequest).toHaveBeenCalledTimes(2)
    expect(onBeforeRequest.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]!
    )
    expect(mocks.getCalcomAccessToken.mock.invocationCallOrder[0]).toBeLessThan(
      onBeforeRequest.mock.invocationCallOrder[0]!
    )
    expect(mocks.getCalcomAccessToken.mock.invocationCallOrder[1]).toBeLessThan(
      onBeforeRequest.mock.invocationCallOrder[1]!
    )
    expect(onBeforeRequest.mock.invocationCallOrder[1]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[1]!
    )
    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    const secondHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(firstHeaders.get('authorization')).toBe('Bearer expired-access-token')
    expect(secondHeaders.get('authorization')).toBe('Bearer fresh-access-token')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ eventTypeId: 42 }),
      cache: 'no-store',
    })
  })

  it('does not write a pre-request marker when OAuth resolution fails', async () => {
    const onBeforeRequest = vi.fn().mockResolvedValue(undefined)
    mocks.getCalcomAccessToken.mockRejectedValueOnce(new Error('token unavailable'))

    await expect(
      calcomRequest('/bookings', {
        method: 'POST',
        userId: 'mentor-user-id',
        onBeforeRequest,
      })
    ).rejects.toThrow('token unavailable')

    expect(onBeforeRequest).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never refreshes more than once and redacts both tokens from final diagnostics', async () => {
    mocks.getCalcomAccessToken
      .mockResolvedValueOnce('expired-access-token')
      .mockResolvedValueOnce('fresh-access-token')
    fetchMock
      .mockResolvedValueOnce(new Response('expired-access-token', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'invalid token',
              message: 'fresh-access-token and private attendee data',
            },
          }),
          { status: 401, headers: { 'x-request-id': 'request id/<unsafe>' } }
        )
      )

    await expect(
      calcomRequest('/bookings?email=private%40example.edu', {
        userId: 'mentor-user-id',
      })
    ).rejects.toThrow('Cal.com API request failed (401)')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(mocks.getCalcomAccessToken).toHaveBeenCalledTimes(2)
    expect(console.error).toHaveBeenCalledWith('Cal.com API request failed', {
      method: 'GET',
      path: '/bookings',
      status: 401,
      code: 'invalid_token',
      requestId: 'request_id__unsafe_',
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain('expired-access-token')
    expect(logged).not.toContain('fresh-access-token')
    expect(logged).not.toContain('private@example.edu')
  })

  it('does not obtain or send OAuth credentials for a public request', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(calcomRequest('/health')).resolves.toBeUndefined()

    expect(mocks.getCalcomAccessToken).not.toHaveBeenCalled()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(getFetchUrl(url)).toBe('https://api.cal.test/v2/health')
    expect(new Headers(init?.headers).has('authorization')).toBe(false)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })
})
