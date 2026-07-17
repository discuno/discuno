import 'server-only'

import { env } from '~/env'

export const CALCOM_REQUEST_TIMEOUT_MS = 15_000

// Cal.com routes may include URLSearchParams output, but never an origin,
// fragment, backslash, whitespace, or another arbitrary URL. Keeping the
// allowlist anchored makes this a security boundary as well as input hygiene.
const CALCOM_ROUTE_PATTERN =
  /^\/[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@%/-]*(?:\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/

const assertSafeCalcomRoute = (path: string): void => {
  if (!CALCOM_ROUTE_PATTERN.test(path)) {
    throw new TypeError('Cal.com request path must be an absolute API route')
  }

  const queryStart = path.indexOf('?')
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart)
  for (const segment of pathname.split('/')) {
    if (!segment) continue

    let decodedSegment: string
    try {
      decodedSegment = decodeURIComponent(segment)
    } catch {
      throw new TypeError('Cal.com request path contains invalid encoding')
    }

    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      Array.from(decodedSegment).some(character => {
        const codePoint = character.charCodeAt(0)
        return character === '/' || character === '\\' || codePoint <= 31 || codePoint === 127
      })
    ) {
      throw new TypeError('Cal.com request path contains an unsafe segment')
    }
  }
}

export const getCalcomApiUrl = (path: string): string => {
  assertSafeCalcomRoute(path)

  const baseUrl = new URL(env.CALCOM_API_URL)
  if (
    baseUrl.protocol !== 'https:' ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new TypeError('CALCOM_API_URL must be a credential-free HTTPS base URL')
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/`
  const requestUrl = new URL(path.slice(1), baseUrl)
  if (
    requestUrl.origin !== baseUrl.origin ||
    !requestUrl.pathname.startsWith(baseUrl.pathname) ||
    requestUrl.hash
  ) {
    throw new TypeError('Cal.com request path escaped the configured API base')
  }

  return requestUrl.href
}

/** Bound provider latency while retaining cancellation from the original caller. */
export const getCalcomRequestSignal = (callerSignal?: AbortSignal | null): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(CALCOM_REQUEST_TIMEOUT_MS)
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal
}
