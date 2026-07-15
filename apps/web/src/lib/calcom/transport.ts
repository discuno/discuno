import 'server-only'

import { env } from '~/env'

export const CALCOM_REQUEST_TIMEOUT_MS = 15_000

export const getCalcomApiUrl = (path: string): string =>
  `${env.CALCOM_API_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

/** Bound provider latency while retaining cancellation from the original caller. */
export const getCalcomRequestSignal = (callerSignal?: AbortSignal | null): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(CALCOM_REQUEST_TIMEOUT_MS)
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal
}
