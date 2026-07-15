const SHARED_HOSTING_SUFFIXES = [
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'github.io',
  'web.app',
  'firebaseapp.com',
  'onrender.com',
  'railway.app',
]

/**
 * Better Auth accepts wildcard host patterns, but shared-host deployment names
 * are not an authorization boundary. Even a fixed prefix can match another
 * customer's project, so every shared-host origin must be exact.
 *
 * @param {string} hostname
 */
const isSharedHostingWildcard = hostname => {
  if (!hostname.includes('*')) return false

  // Removing the wildcard also catches adjacent forms such as
  // `vercel*.app`, which can still match the shared provider apex.
  const fixedHostname = hostname.replaceAll('*', '')

  return SHARED_HOSTING_SUFFIXES.some(
    suffix => fixedHostname === suffix || fixedHostname.endsWith(`.${suffix}`)
  )
}

/**
 * Parse and normalize the optional Better Auth origin allowlist. Errors name
 * only the entry position so a mistakenly pasted credential is never echoed.
 *
 * @param {string | undefined} value
 * @returns {string[]}
 */
export const parseConfiguredTrustedOrigins = value => {
  if (value === undefined) return []

  const entries = value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
  if (entries.length === 0) {
    throw new Error('Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 1: expected an HTTP(S) origin')
  }

  const normalized = entries.map((entry, index) => {
    /** @param {string} reason */
    const invalid = reason =>
      new Error(`Invalid BETTER_AUTH_TRUSTED_ORIGINS entry ${index + 1}: ${reason}`)

    /** @type {URL} */
    let url
    try {
      url = new URL(entry)
    } catch {
      throw invalid('expected an HTTP(S) origin')
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw invalid('expected an HTTP(S) origin')
    }
    if (url.username || url.password) {
      throw invalid('credentials are not allowed')
    }
    if (entry.includes('?') || entry.includes('#')) {
      throw invalid('query strings and fragments are not allowed')
    }
    if (url.pathname !== '/') {
      throw invalid('paths are not allowed')
    }

    const hostname = url.hostname.toLowerCase()
    if (hostname.includes('*')) {
      if (!/^[a-z0-9.*-]+$/i.test(hostname)) {
        throw invalid('wildcard hostname is malformed')
      }
      const fixedLabels = hostname
        .replaceAll('*', '')
        .split('.')
        .filter(label => /[a-z0-9]/i.test(label))
      if (fixedLabels.length < 2 || isSharedHostingWildcard(hostname)) {
        throw invalid('wildcard is broader than a controlled deployment namespace')
      }
    }

    return url.origin
  })

  return [...new Set(normalized)]
}

/** @param {string} value */
export const isValidConfiguredTrustedOrigins = value => {
  try {
    parseConfiguredTrustedOrigins(value)
    return true
  } catch {
    return false
  }
}

/**
 * Validate cross-field secret requirements before `createEnv` builds its
 * client-safe proxy. This runs only on the server and is intentionally skipped
 * together with the rest of environment validation for local tooling.
 *
 * @param {{
 *   betterAuthSecret?: string,
 *   betterAuthSecrets?: string,
 *   calcomAllowLegacySharedWebhooks?: string,
 *   calcomWebhookSecret?: string,
 * }} environment
 */
export const assertServerEnvironmentSecretCombinations = environment => {
  if (!environment.betterAuthSecret?.trim() && !environment.betterAuthSecrets?.trim()) {
    throw new Error('Configure BETTER_AUTH_SECRETS or the legacy BETTER_AUTH_SECRET')
  }

  if (
    environment.calcomAllowLegacySharedWebhooks === 'true' &&
    !environment.calcomWebhookSecret?.trim()
  ) {
    throw new Error(
      'CALCOM_WEBHOOK_SECRET is required when CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=true'
    )
  }
}
