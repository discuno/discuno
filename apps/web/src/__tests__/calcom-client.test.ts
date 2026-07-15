import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/env', () => ({
  env: {
    NEXT_PUBLIC_CALCOM_API_URL: 'https://api.cal.test/v2',
    NEXT_PUBLIC_X_CAL_ID: 'test-client-id',
    X_CAL_SECRET_KEY: 'test-secret-key',
  },
}))

import { calcomRequest } from '~/lib/calcom/client'

describe('Cal.com API error observability', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('logs only a sanitized structured provider error without query-string PII or details', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'error',
          error: {
            code: 'BadRequestException',
            message:
              'Attendee delivered@resend.dev, phone +1 (973) 555-0100, URL https://private.example/booking',
            details: {
              token: 'raw-secret-token',
              echoedEmail: 'delivered@resend.dev',
            },
          },
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req 123/<unsafe>',
          },
        }
      )
    )

    await expect(
      calcomRequest('/bookings?attendeeEmail=delivered%40resend.dev', { method: 'POST' })
    ).rejects.toThrow(
      'Cal.com API request failed (400): BadRequestException: Attendee [redacted-email], phone [redacted-phone], URL [redacted-url]'
    )

    expect(console.error).toHaveBeenCalledWith('Cal.com API request failed', {
      method: 'POST',
      path: '/bookings',
      status: 400,
      code: 'BadRequestException',
      message: 'Attendee [redacted-email], phone [redacted-phone], URL [redacted-url]',
      requestId: 'req_123__unsafe_',
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain('delivered')
    expect(logged).not.toContain('raw-secret-token')
    expect(logged).not.toContain('private.example')
  })

  it('bounds the provider message included in logs and the thrown error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'BadRequestException',
            message: 'x'.repeat(600),
          },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(calcomRequest('/bookings', { method: 'POST' })).rejects.toThrow(
      `Cal.com API request failed (400): BadRequestException: ${'x'.repeat(500)}`
    )
    expect(console.error).toHaveBeenCalledWith('Cal.com API request failed', {
      method: 'POST',
      path: '/bookings',
      status: 400,
      code: 'BadRequestException',
      message: 'x'.repeat(500),
    })
  })

  it('falls back to status-only diagnostics for non-JSON provider responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>delivered@resend.dev raw-secret-token</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      })
    )

    await expect(calcomRequest('/bookings?attendeeEmail=delivered%40resend.dev')).rejects.toThrow(
      'Cal.com API request failed (502)'
    )
    expect(console.error).toHaveBeenCalledWith('Cal.com API request failed', {
      method: 'GET',
      path: '/bookings',
      status: 502,
    })
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('delivered')
  })

  it('does not parse oversized provider error bodies', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'BadRequestException',
            message: 'raw-secret-token',
            padding: 'x'.repeat(9_000),
          },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(calcomRequest('/bookings', { method: 'POST' })).rejects.toThrow(
      'Cal.com API request failed (400)'
    )
    expect(console.error).toHaveBeenCalledWith('Cal.com API request failed', {
      method: 'POST',
      path: '/bookings',
      status: 400,
    })
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('raw-secret-token')
  })
})
