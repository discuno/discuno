import 'server-only'

import { getCalcomAccessToken } from '~/lib/calcom/tokens'
import { getCalcomApiUrl, getCalcomRequestSignal } from '~/lib/calcom/transport'
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

type CalcomRequestInit = RequestInit & {
  apiVersion?: string
  userId?: string
  /** Pre-resolved OAuth token for code already holding the connection lock. */
  accessToken?: string
  /** Durable marker written after auth resolution and immediately before fetch. */
  onBeforeRequest?: () => Promise<void>
  /** Resolve that marker after a definitive response and before an authenticated retry. */
  onDefinitiveResponseBeforeRetry?: (providerStatus: number) => Promise<void>
}

const executeCalcomRequest = async (
  path: string,
  requestInit: RequestInit,
  apiVersion?: string,
  accessToken?: string
): Promise<Response> => {
  const headers = new Headers(requestInit.headers)
  if (apiVersion) headers.set('cal-api-version', apiVersion)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (requestInit.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  return fetch(getCalcomApiUrl(path), {
    ...requestInit,
    headers,
    cache: requestInit.cache ?? 'no-store',
    signal: getCalcomRequestSignal(requestInit.signal),
  })
}

export const calcomRequest = async <T>(path: string, init: CalcomRequestInit = {}): Promise<T> => {
  const {
    apiVersion,
    userId,
    accessToken: suppliedAccessToken,
    onBeforeRequest,
    onDefinitiveResponseBeforeRetry,
    ...requestInit
  } = init
  if (userId && suppliedAccessToken) {
    throw new TypeError('Cal.com requests must use either a user ID or a supplied access token')
  }
  let accessToken = suppliedAccessToken ?? (userId ? await getCalcomAccessToken(userId) : undefined)
  await onBeforeRequest?.()
  let response = await executeCalcomRequest(path, requestInit, apiVersion, accessToken)

  // Tokens can be revoked or expire just before a request. Refresh once under
  // the per-user database lock, then retry the same idempotent/request-safe call.
  if (response.status === 401 && userId) {
    // The provider has definitively rejected this request, so no mutation from
    // this attempt remains ambiguous. Clear any durable mutation marker before
    // token refresh: refresh itself can fail, and a later retry must then be
    // allowed to make a new, freshly marked request.
    await onDefinitiveResponseBeforeRetry?.(response.status)
    accessToken = await getCalcomAccessToken(userId, { forceRefresh: true })
    await onBeforeRequest?.()
    response = await executeCalcomRequest(path, requestInit, apiVersion, accessToken)
  }

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
    throw new ExternalApiError(`Cal.com API request failed (${response.status})`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
