import 'server-only'

import { env } from '~/env'
import { ExternalApiError } from '~/lib/errors'

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
    console.error('Cal.com API request failed', {
      method: requestInit.method ?? 'GET',
      path,
      status: response.status,
    })
    throw new ExternalApiError(`Cal.com API request failed (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
