import { parseConfiguredTrustedOrigins } from './environment-validation'

const DEFAULT_PRODUCTION_URL = 'https://discuno.com'

export const AUTH_SESSION_COOKIE_CACHE_SECONDS = 5 * 60
export const AUTH_SESSION_FRESH_AGE_SECONDS = 15 * 60

export type VersionedAuthSecret = {
  version: number
  value: string
}

export type BetterAuthSecretConfig = {
  secret?: string
  secrets?: VersionedAuthSecret[]
}

/**
 * Parse Better Auth's versioned secret ring without ever including secret
 * material in validation errors. The declared order is significant: Better
 * Auth encrypts with the first entry and keeps the remaining entries only for
 * decrypting data written before a rotation.
 */
export const parseBetterAuthSecrets = (value?: string): VersionedAuthSecret[] | undefined => {
  if (!value?.trim()) return undefined

  const secrets: VersionedAuthSecret[] = []
  const seenVersions = new Set<number>()

  for (const [index, rawEntry] of value.split(',').entries()) {
    const entry = rawEntry.trim()
    const separatorIndex = entry.indexOf(':')

    if (separatorIndex <= 0) {
      throw new Error(`Invalid BETTER_AUTH_SECRETS entry ${index + 1}; expected <version>:<secret>`)
    }

    const rawVersion = entry.slice(0, separatorIndex).trim()
    const secret = entry.slice(separatorIndex + 1).trim()

    if (!/^\d+$/.test(rawVersion)) {
      throw new Error(
        `Invalid BETTER_AUTH_SECRETS version at entry ${index + 1}; expected a non-negative integer`
      )
    }

    const version = Number(rawVersion)
    if (!Number.isSafeInteger(version)) {
      throw new Error(`Invalid BETTER_AUTH_SECRETS version at entry ${index + 1}`)
    }
    if (seenVersions.has(version)) {
      throw new Error(`Duplicate BETTER_AUTH_SECRETS version ${version}`)
    }
    if (secret.length < 32) {
      throw new Error(
        `BETTER_AUTH_SECRETS entry ${index + 1} must contain a secret of at least 32 characters`
      )
    }

    seenVersions.add(version)
    secrets.push({ version, value: secret })
  }

  return secrets
}

/**
 * Keep the legacy key only while pre-envelope values still need it. A
 * versioned-only configuration is the terminal rotation state and lets a
 * compromised or retired legacy key leave the runtime completely.
 */
export const resolveBetterAuthSecretConfig = (
  legacySecret?: string,
  versionedSecrets?: string
): BetterAuthSecretConfig => {
  const secrets = parseBetterAuthSecrets(versionedSecrets)
  if (!legacySecret && !secrets) {
    throw new Error('Configure BETTER_AUTH_SECRETS or the legacy BETTER_AUTH_SECRET')
  }

  return {
    ...(legacySecret ? { secret: legacySecret } : {}),
    ...(secrets ? { secrets } : {}),
  }
}

/** Match the key Better Auth itself treats as active for new cryptographic work. */
export const resolveActiveBetterAuthSecret = (config: BetterAuthSecretConfig): string => {
  const activeSecret = config.secrets?.[0]?.value ?? config.secret
  if (!activeSecret) {
    throw new Error('Better Auth has no active secret')
  }
  return activeSecret
}

const REAUTHENTICATION_FALLBACK = '/settings'
const REAUTHENTICATION_ORIGIN = 'https://discuno.invalid'
const CALCOM_RETURN_PATHS = new Set(['/settings', '/settings/calendar'])

/** Keep Cal.com completion redirects on the two settings pages that own the flow. */
export const resolveCalcomOAuthReturnTo = (value?: string | null): string => {
  if (!value) return REAUTHENTICATION_FALLBACK

  try {
    const url = new URL(value, REAUTHENTICATION_ORIGIN)
    if (url.origin !== REAUTHENTICATION_ORIGIN || !CALCOM_RETURN_PATHS.has(url.pathname)) {
      return REAUTHENTICATION_FALLBACK
    }
    return url.pathname
  } catch {
    return REAUTHENTICATION_FALLBACK
  }
}

/** Restrict post-reauthentication navigation to mentor settings or the Cal.com resume route. */
export const resolveReauthenticationReturnTo = (value?: string | null): string => {
  if (!value) return REAUTHENTICATION_FALLBACK

  try {
    const url = new URL(value, REAUTHENTICATION_ORIGIN)
    const isSameOrigin = url.origin === REAUTHENTICATION_ORIGIN
    const isSettingsPath = url.pathname === '/settings' || url.pathname.startsWith('/settings/')
    const isCalcomResumePath = url.pathname === '/api/integrations/calcom/connect'

    if (!isSameOrigin || (!isSettingsPath && !isCalcomResumePath)) {
      return REAUTHENTICATION_FALLBACK
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return REAUTHENTICATION_FALLBACK
  }
}

export const buildReauthenticationPath = (returnTo: string): string => {
  const searchParams = new URLSearchParams({
    intent: 'mentor',
    reauth: '1',
    returnTo: resolveReauthenticationReturnTo(returnTo),
  })
  return `/auth?${searchParams.toString()}`
}

/** Start a mentor sign-in and safely resume the protected calendar/settings flow afterward. */
export const buildMentorSignInPath = (returnTo: string): string => {
  const searchParams = new URLSearchParams({
    intent: 'mentor',
    returnTo: resolveReauthenticationReturnTo(returnTo),
  })
  return `/auth?${searchParams.toString()}`
}

type AuthURLRuntime = {
  betterAuthUrl?: string
  nextPublicAppUrl?: string
  nextPublicBaseUrl: string
  vercelEnv?: string
  vercelUrl?: string
}

type TrustedOriginRuntime = AuthURLRuntime & {
  configuredOrigins?: string
  nodeEnv: 'development' | 'test' | 'production'
  productionUrl?: string
  vercelBranchUrl?: string
  vercelProjectProductionUrl?: string
}

const toURL = (value: string): URL => {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return new URL(candidate)
}

const toOrigin = (value: string): string => toURL(value).origin

/**
 * Resolve an explicit per-deployment Better Auth URL.
 *
 * Preview deployments use Vercel's exact deployment host even when the
 * inherited BETTER_AUTH_URL points at production. Other environments prefer
 * BETTER_AUTH_URL and fall back to the application's validated public URL.
 */
export const resolveAuthBaseURL = (runtime: AuthURLRuntime): string => {
  if (
    runtime.vercelUrl &&
    (runtime.vercelEnv === 'preview' || runtime.vercelEnv === 'development')
  ) {
    return toOrigin(runtime.vercelUrl)
  }

  return toOrigin(runtime.betterAuthUrl ?? runtime.nextPublicAppUrl ?? runtime.nextPublicBaseUrl)
}

/**
 * Keep CSRF/origin trust scoped to Discuno-controlled domains and the exact
 * deployment aliases supplied by Vercel. Additional preview aliases can be
 * configured explicitly as a comma-separated allowlist. Shared-host services
 * such as Vercel require exact origins; wildcards are reserved for custom
 * domains Discuno controls.
 */
export const resolveTrustedOrigins = (runtime: TrustedOriginRuntime): string[] => {
  const origins = new Set<string>([
    toOrigin(runtime.productionUrl ?? DEFAULT_PRODUCTION_URL),
    resolveAuthBaseURL(runtime),
    toOrigin(runtime.nextPublicBaseUrl),
  ])

  if (runtime.nextPublicAppUrl) origins.add(toOrigin(runtime.nextPublicAppUrl))
  if (runtime.vercelUrl) origins.add(toOrigin(runtime.vercelUrl))
  if (runtime.vercelBranchUrl) origins.add(toOrigin(runtime.vercelBranchUrl))
  if (runtime.vercelProjectProductionUrl) {
    origins.add(toOrigin(runtime.vercelProjectProductionUrl))
  }

  for (const origin of parseConfiguredTrustedOrigins(runtime.configuredOrigins)) {
    origins.add(origin)
  }

  if (runtime.nodeEnv !== 'production') {
    origins.add('http://localhost:*')
    origins.add('http://127.0.0.1:*')
  }

  return [...origins]
}
