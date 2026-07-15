import { parseBetterAuthSecrets } from './config'
import { parseConfiguredTrustedOrigins } from './environment-validation'

export type IntegrationReadinessEnvironment = 'local' | 'preview' | 'production'

type EnvironmentSource = Record<string, string | undefined>

const DEFAULT_PRODUCTION_URL = 'https://discuno.com'

const configured = (environment: EnvironmentSource, name: string): string => {
  const value = environment[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

const assertMinimumLength = (name: string, value: string, minimum: number): void => {
  if (value.length < minimum) {
    throw new Error(`${name} must contain at least ${minimum} characters`)
  }
}

const parseAuthOrigin = (
  name: string,
  value: string,
  environment: IntegrationReadinessEnvironment
): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an HTTP(S) origin`)
  }

  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  const hasOnlyOrigin =
    !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
  const isSafeTransport = environment === 'local' || url.protocol === 'https:'
  if (!isHttp || !hasOnlyOrigin || !isSafeTransport) {
    throw new Error(`${name} must be a safe HTTP(S) origin`)
  }

  return url.origin
}

/**
 * Validate authentication readiness without connecting to a provider or
 * including any credential material in errors. This mirrors the runtime's
 * cross-field requirements and catches environment drift before deployment.
 */
export const assertAuthIntegrationReadiness = (
  source: EnvironmentSource,
  environment: IntegrationReadinessEnvironment
): void => {
  const legacySecret = source.BETTER_AUTH_SECRET?.trim()
  const versionedSecrets = source.BETTER_AUTH_SECRETS?.trim()
  if (!legacySecret && !versionedSecrets) {
    throw new Error('Configure BETTER_AUTH_SECRETS or the legacy BETTER_AUTH_SECRET')
  }
  if (legacySecret) assertMinimumLength('BETTER_AUTH_SECRET', legacySecret, 32)
  if (versionedSecrets) parseBetterAuthSecrets(versionedSecrets)

  assertMinimumLength('OAUTH_PROXY_SECRET', configured(source, 'OAUTH_PROXY_SECRET'), 32)

  const googleClientId = configured(source, 'AUTH_GOOGLE_ID')
  configured(source, 'AUTH_GOOGLE_SECRET')
  const publicGoogleClientId = configured(source, 'NEXT_PUBLIC_AUTH_GOOGLE_ID')
  configured(source, 'AUTH_MICROSOFT_ENTRA_ID_ID')
  configured(source, 'AUTH_MICROSOFT_ENTRA_ID_SECRET')
  if (googleClientId !== publicGoogleClientId) {
    throw new Error('AUTH_GOOGLE_ID and NEXT_PUBLIC_AUTH_GOOGLE_ID must match')
  }

  const publicBaseUrl = configured(source, 'NEXT_PUBLIC_BASE_URL')
  parseAuthOrigin('NEXT_PUBLIC_BASE_URL', publicBaseUrl, environment)
  if (source.NEXT_PUBLIC_APP_URL?.trim()) {
    parseAuthOrigin('NEXT_PUBLIC_APP_URL', source.NEXT_PUBLIC_APP_URL.trim(), environment)
  }
  if (source.BETTER_AUTH_URL?.trim()) {
    parseAuthOrigin('BETTER_AUTH_URL', source.BETTER_AUTH_URL.trim(), environment)
  }
  let productionUrl = DEFAULT_PRODUCTION_URL
  if (source.BETTER_AUTH_PRODUCTION_URL?.trim()) {
    productionUrl = source.BETTER_AUTH_PRODUCTION_URL.trim()
  }
  parseAuthOrigin('BETTER_AUTH_PRODUCTION_URL', productionUrl, 'production')

  if (source.BETTER_AUTH_TRUSTED_ORIGINS !== undefined) {
    const trustedOrigins = parseConfiguredTrustedOrigins(source.BETTER_AUTH_TRUSTED_ORIGINS)
    if (
      environment !== 'local' &&
      trustedOrigins.some(origin => origin.toLowerCase().startsWith('http://'))
    ) {
      throw new Error('BETTER_AUTH_TRUSTED_ORIGINS must use HTTPS outside local development')
    }
  }
}
