import 'server-only'

import { env } from '~/env'
import { ExternalApiError } from '~/lib/errors'

const MAX_CALCOM_ERROR_BODY_LENGTH = 8_192
const MAX_CALCOM_ERROR_CODE_LENGTH = 80
const MAX_CALCOM_REQUEST_ID_LENGTH = 128

type CalcomErrorSummary = {
  code?: string
  requestId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sanitizeIdentifier = (value: string, maximumLength: number): string | undefined => {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .slice(0, maximumLength)
  return sanitized || undefined
}

const getCalcomErrorSummary = async (response: Response): Promise<CalcomErrorSummary> => {
  const requestIdHeader = response.headers.get('x-request-id')
  const requestId = requestIdHeader
    ? sanitizeIdentifier(requestIdHeader, MAX_CALCOM_REQUEST_ID_LENGTH)
    : undefined

  try {
    const body = await response.text()
    if (!body || body.length > MAX_CALCOM_ERROR_BODY_LENGTH) return { requestId }

    const parsed: unknown = JSON.parse(body)
    if (!isRecord(parsed) || !isRecord(parsed.error)) return { requestId }

    const code =
      typeof parsed.error.code === 'string'
        ? sanitizeIdentifier(parsed.error.code, MAX_CALCOM_ERROR_CODE_LENGTH)
        : undefined
    return { code, requestId }
  } catch {
    return { requestId }
  }
}

export const CALCOM_API_VERSIONS = {
  bookings: '2026-02-25',
  bookingList: '2026-05-01',
  eventTypes: '2024-06-14',
  schedules: '2024-06-11',
  slots: '2024-09-04',
} as const

export const getCalcomPlatformHeaders = (apiVersion?: string): HeadersInit => ({
  'x-cal-client-id': env.NEXT_PUBLIC_X_CAL_ID,
  'x-cal-secret-key': env.X_CAL_SECRET_KEY,
  ...(apiVersion ? { 'cal-api-version': apiVersion } : {}),
})

export const calcomRequest = async <T>(
  path: string,
  init: RequestInit & { apiVersion?: string } = {}
): Promise<T> => {
  const { apiVersion, ...requestInit } = init
  const headers = new Headers(requestInit.headers)

  for (const [key, value] of Object.entries(getCalcomPlatformHeaders(apiVersion))) {
    headers.set(key, value)
  }
  if (requestInit.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}${path}`, {
    ...requestInit,
    headers,
  })

  if (!response.ok) {
    const summary = await getCalcomErrorSummary(response)
    const pathWithoutQuery = path.split(/[?#]/, 1)[0]
    console.error('Cal.com API request failed', {
      method: requestInit.method ?? 'GET',
      path: pathWithoutQuery?.length ? pathWithoutQuery : '/',
      status: response.status,
      ...(summary.code ? { code: summary.code } : {}),
      ...(summary.requestId ? { requestId: summary.requestId } : {}),
    })
    throw new ExternalApiError(`Cal.com API request failed (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
