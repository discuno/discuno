import 'server-only'

import { z } from 'zod'
import { env } from '~/env'
import { getCalcomApiUrl, getCalcomRequestSignal } from '~/lib/calcom/transport'
import { ExternalApiError } from '~/lib/errors'

export const CALCOM_OAUTH_SCOPES = [
  'PROFILE_READ',
  'EVENT_TYPE_READ',
  'BOOKING_READ',
  'BOOKING_WRITE',
  'SCHEDULE_READ',
  'SCHEDULE_WRITE',
  'WEBHOOK_READ',
  'WEBHOOK_WRITE',
] as const

export const CALCOM_OAUTH_COOKIE = 'discuno_calcom_oauth'

const OAuthTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().min(1).default('bearer'),
  expires_in: z.number().int().positive(),
  scope: z.string().default(''),
})

const OAuthErrorResponseSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
})

const OAuthProviderErrorCodeSchema = z.enum([
  'invalid_grant',
  'invalid_client',
  'invalid_request',
  'invalid_scope',
  'unauthorized_client',
  'unsupported_grant_type',
  'server_error',
  'temporarily_unavailable',
])

export type CalcomOAuthTokenErrorCode =
  z.infer<typeof OAuthProviderErrorCodeSchema> | 'invalid_response' | 'not_configured' | 'unknown'

/** A redacted token-endpoint failure callers can safely branch on. */
export class CalcomOAuthTokenError extends ExternalApiError {
  public readonly oauthErrorCode: CalcomOAuthTokenErrorCode

  constructor(oauthErrorCode: CalcomOAuthTokenErrorCode) {
    super('Cal.com authorization could not be completed')
    this.name = 'CalcomOAuthTokenError'
    this.oauthErrorCode = oauthErrorCode
  }
}

export const CalcomMeResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    id: z.number().int().positive(),
    username: z.string().min(1),
    email: z.email(),
    name: z.string().nullish(),
    timeZone: z.string().nullish(),
    defaultScheduleId: z.number().int().positive().nullish(),
  }),
})

export type CalcomOAuthTokens = z.infer<typeof OAuthTokenResponseSchema>

export const hasRequiredCalcomOAuthScopes = (scope: string): boolean => {
  const granted = new Set(scope.split(/[\s,]+/).filter(Boolean))
  return CALCOM_OAUTH_SCOPES.every(requiredScope => granted.has(requiredScope))
}

export const buildCalcomAuthorizationUrl = (state: string): URL => {
  const url = new URL('/auth/oauth2/authorize', env.CALCOM_APP_URL)
  url.searchParams.set('client_id', env.CALCOM_OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', env.CALCOM_OAUTH_REDIRECT_URI)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', CALCOM_OAUTH_SCOPES.join(' '))
  return url
}

const exchangeWithSecret = async (
  body: Record<string, string>,
  clientSecret: string
): Promise<Response> =>
  fetch(getCalcomApiUrl('/auth/oauth2/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.CALCOM_OAUTH_CLIENT_ID,
      client_secret: clientSecret,
      ...body,
    }),
    cache: 'no-store',
    signal: getCalcomRequestSignal(),
  })

const exchangeToken = async (body: Record<string, string>): Promise<CalcomOAuthTokens> => {
  const secrets = [env.CALCOM_OAUTH_CLIENT_SECRET, env.CALCOM_OAUTH_CLIENT_SECRET_FALLBACK].filter(
    (value): value is string => Boolean(value)
  )

  for (const [index, secret] of secrets.entries()) {
    const response = await exchangeWithSecret(body, secret)
    if (response.ok) {
      const tokens = OAuthTokenResponseSchema.safeParse(
        await response.json().catch(() => undefined)
      )
      if (tokens.success) return tokens.data

      console.error('Cal.com OAuth token exchange returned an invalid response', {
        status: response.status,
      })
      throw new CalcomOAuthTokenError('invalid_response')
    }

    const error = OAuthErrorResponseSchema.safeParse(await response.json().catch(() => ({})))
    const oauthErrorCode = OAuthProviderErrorCodeSchema.safeParse(
      error.success ? error.data.error : undefined
    )
    const safeErrorCode = oauthErrorCode.success ? oauthErrorCode.data : 'unknown'
    const mayRetryRotatedSecret = safeErrorCode === 'invalid_client' && index < secrets.length - 1
    if (mayRetryRotatedSecret) continue

    console.error('Cal.com OAuth token exchange failed', {
      status: response.status,
      error: safeErrorCode,
    })
    throw new CalcomOAuthTokenError(safeErrorCode)
  }

  throw new CalcomOAuthTokenError('not_configured')
}

export const exchangeCalcomAuthorizationCode = (code: string): Promise<CalcomOAuthTokens> =>
  exchangeToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.CALCOM_OAUTH_REDIRECT_URI,
  })

export const refreshCalcomOAuthTokens = (refreshToken: string): Promise<CalcomOAuthTokens> =>
  exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

export const getCalcomOAuthProfile = async (accessToken: string) => {
  const response = await fetch(getCalcomApiUrl('/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: getCalcomRequestSignal(),
  })
  if (!response.ok) {
    console.error('Cal.com OAuth profile verification failed', { status: response.status })
    throw new ExternalApiError('Cal.com account verification failed')
  }

  const profile = CalcomMeResponseSchema.safeParse(await response.json().catch(() => undefined))
  if (!profile.success) {
    console.error('Cal.com OAuth profile verification returned an invalid response', {
      status: response.status,
    })
    throw new ExternalApiError('Cal.com account verification failed')
  }
  return profile.data.data
}
