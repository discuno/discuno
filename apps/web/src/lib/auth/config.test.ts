import { describe, expect, it } from 'vitest'
import {
  AUTH_SESSION_COOKIE_CACHE_SECONDS,
  AUTH_SESSION_FRESH_AGE_SECONDS,
  buildMentorSignInPath,
  buildReauthenticationPath,
  parseBetterAuthSecrets,
  resolveActiveBetterAuthSecret,
  resolveAuthBaseURL,
  resolveBetterAuthSecretConfig,
  resolveCalcomOAuthReturnTo,
  resolveReauthenticationReturnTo,
  resolveTrustedOrigins,
} from './config'
import {
  assertServerEnvironmentSecretCombinations,
  parseConfiguredTrustedOrigins,
} from './environment-validation'

const baseRuntime = {
  betterAuthUrl: 'https://discuno.com',
  nextPublicBaseUrl: 'https://discuno.com',
}

describe('Better Auth URL configuration', () => {
  it('keeps the session cookie cache short lived', () => {
    expect(AUTH_SESSION_COOKIE_CACHE_SECONDS).toBe(300)
    expect(AUTH_SESSION_FRESH_AGE_SECONDS).toBe(900)
  })

  it('parses a versioned secret ring in declared encryption order', () => {
    const current = `current:${'a'.repeat(32)}`
    const previous = `previous-${'b'.repeat(32)}`

    expect(parseBetterAuthSecrets(`2:${current}, 1:${previous}`)).toEqual([
      { version: 2, value: current },
      { version: 1, value: previous },
    ])
  })

  it('keeps legacy-only deployments compatible when no rotation ring is configured', () => {
    expect(parseBetterAuthSecrets()).toBeUndefined()
    expect(parseBetterAuthSecrets('  ')).toBeUndefined()

    const legacySecret = `legacy-${'a'.repeat(32)}`
    expect(resolveBetterAuthSecretConfig(legacySecret)).toEqual({
      secret: legacySecret,
    })
    expect(resolveActiveBetterAuthSecret(resolveBetterAuthSecretConfig(legacySecret))).toBe(
      legacySecret
    )
  })

  it('retains the legacy fallback while enabling versioned envelope encryption', () => {
    const legacySecret = `legacy-${'a'.repeat(32)}`
    const currentSecret = `current-${'b'.repeat(32)}`

    expect(resolveBetterAuthSecretConfig(legacySecret, `2:${currentSecret}`)).toEqual({
      secret: legacySecret,
      secrets: [{ version: 2, value: currentSecret }],
    })
  })

  it('retires the legacy secret after the versioned ring migration is complete', () => {
    const currentSecret = `current-${'b'.repeat(32)}`
    const config = resolveBetterAuthSecretConfig(undefined, `3:${currentSecret}`)

    expect(config).toEqual({ secrets: [{ version: 3, value: currentSecret }] })
    expect(resolveActiveBetterAuthSecret(config)).toBe(currentSecret)
    expect(() => resolveBetterAuthSecretConfig()).toThrow(
      'Configure BETTER_AUTH_SECRETS or the legacy BETTER_AUTH_SECRET'
    )
  })

  it('rejects duplicate, malformed, and weak versioned secrets', () => {
    const strongSecret = 'a'.repeat(32)

    expect(() => parseBetterAuthSecrets(`1:${strongSecret},1:${'b'.repeat(32)}`)).toThrow(
      'Duplicate BETTER_AUTH_SECRETS version 1'
    )
    expect(() => parseBetterAuthSecrets(`version:${strongSecret}`)).toThrow(
      'expected a non-negative integer'
    )
    expect(() => parseBetterAuthSecrets('1:too-short-and-sensitive')).toThrow(
      'at least 32 characters'
    )
  })

  it('preserves only safe reauthentication destinations', () => {
    const calcomResume =
      '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar#connection'

    expect(resolveReauthenticationReturnTo('/settings/event-types')).toBe('/settings/event-types')
    expect(resolveReauthenticationReturnTo(calcomResume)).toBe(calcomResume)
    expect(resolveReauthenticationReturnTo('https://attacker.example/settings')).toBe('/settings')
    expect(resolveReauthenticationReturnTo('//attacker.example/settings')).toBe('/settings')
    expect(resolveReauthenticationReturnTo('/\\attacker.example/settings')).toBe('/settings')
    expect(resolveReauthenticationReturnTo('/api/auth/sign-out')).toBe('/settings')
  })

  it.each([
    ['https://attacker.example/settings/calendar', '/settings'],
    ['//attacker.example/settings/calendar', '/settings'],
    ['/settings/../../api/auth/sign-out', '/settings'],
    ['/settings/%2e%2e/%2e%2e/api/auth/sign-out', '/settings'],
    ['/settings/calendar?next=/api/auth/sign-out', '/settings/calendar'],
    ['/settings/event-types', '/settings'],
  ])('normalizes an unsafe Cal.com completion destination %s', (value, expected) => {
    expect(resolveCalcomOAuthReturnTo(value)).toBe(expected)
  })

  it('allows only the settings roots that own Cal.com setup', () => {
    expect(resolveCalcomOAuthReturnTo('/settings')).toBe('/settings')
    expect(resolveCalcomOAuthReturnTo('/settings/calendar')).toBe('/settings/calendar')
  })

  it('builds a same-origin mentor reauthentication path', () => {
    const path = buildReauthenticationPath('/settings/calendar')
    const url = new URL(path, 'https://discuno.test')

    expect(url.pathname).toBe('/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      intent: 'mentor',
      reauth: '1',
      returnTo: '/settings/calendar',
    })
  })

  it('builds a normal mentor sign-in path that safely resumes Cal.com setup', () => {
    const path = buildMentorSignInPath(
      '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar'
    )
    const url = new URL(path, 'https://discuno.test')

    expect(url.pathname).toBe('/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      intent: 'mentor',
      returnTo: '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar',
    })
    expect(buildMentorSignInPath('https://attacker.example/settings')).toBe(
      '/auth?intent=mentor&returnTo=%2Fsettings'
    )
  })

  it('uses the exact Vercel URL for previews', () => {
    expect(
      resolveAuthBaseURL({
        ...baseRuntime,
        vercelEnv: 'preview',
        vercelUrl: 'discuno-web-example.vercel.app',
      })
    ).toBe('https://discuno-web-example.vercel.app')
  })

  it('prefers the configured URL in production', () => {
    expect(
      resolveAuthBaseURL({
        ...baseRuntime,
        vercelEnv: 'production',
        vercelUrl: 'discuno-web-production.vercel.app',
      })
    ).toBe('https://discuno.com')
  })

  it('allows exact shared-host deployments and controlled custom-domain patterns', () => {
    const origins = resolveTrustedOrigins({
      ...baseRuntime,
      configuredOrigins: 'https://discuno-web-preview.vercel.app, https://*.preview.discuno.com',
      nodeEnv: 'production',
      productionUrl: 'https://discuno.com',
      vercelBranchUrl: 'discuno-web-main.vercel.app',
    })

    expect(origins).toContain('https://discuno.com')
    expect(origins).toContain('https://discuno-web-main.vercel.app')
    expect(origins).toContain('https://discuno-web-preview.vercel.app')
    expect(origins).toContain('https://*.preview.discuno.com')
    expect(origins).not.toContain('https://*.vercel.app')
    expect(origins).not.toContain('https://*.discuno.com')
  })

  it('normalizes exact shared-host origins and controlled custom-domain patterns', () => {
    expect(
      parseConfiguredTrustedOrigins(
        'HTTPS://Preview.Discuno.COM:443/, https://discuno-web-preview.vercel.app'
      )
    ).toEqual(['https://preview.discuno.com', 'https://discuno-web-preview.vercel.app'])
  })

  it.each([
    'ftp://preview.discuno.com',
    'https://preview.discuno.com/settings',
    'https://user:password@preview.discuno.com',
    'https://preview.discuno.com?redirect=attacker',
    'https://preview.discuno.com#fragment',
    'https://*.vercel.app',
    'https://discuno-web-*.vercel.app',
    'https://vercel*.app',
    'https://v*ercel.app',
    'https://discuno-*.pages.dev',
    'https://**.netlify.app',
    'https://*',
  ])('rejects an unsafe configured origin pattern: %s', origin => {
    expect(() => parseConfiguredTrustedOrigins(origin)).toThrow(
      'Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 1'
    )
  })

  it('supports local development on a non-default port outside production', () => {
    const origins = resolveTrustedOrigins({
      ...baseRuntime,
      nodeEnv: 'development',
    })

    expect(origins).toContain('http://localhost:*')
    expect(origins).toContain('http://127.0.0.1:*')
  })
})

describe('cross-field server secret validation', () => {
  const versionedSecret = `2:${'a'.repeat(32)}`

  it('accepts legacy-only, rotating, and versioned-only Better Auth configurations', () => {
    expect(() =>
      assertServerEnvironmentSecretCombinations({ betterAuthSecret: 'a'.repeat(32) })
    ).not.toThrow()
    expect(() =>
      assertServerEnvironmentSecretCombinations({
        betterAuthSecret: 'a'.repeat(32),
        betterAuthSecrets: versionedSecret,
      })
    ).not.toThrow()
    expect(() =>
      assertServerEnvironmentSecretCombinations({ betterAuthSecrets: versionedSecret })
    ).not.toThrow()
  })

  it('requires at least one Better Auth secret source', () => {
    expect(() => assertServerEnvironmentSecretCombinations({})).toThrow(
      'Configure BETTER_AUTH_SECRETS or the legacy BETTER_AUTH_SECRET'
    )
  })

  it('requires the legacy Cal.com secret only when the migration route is enabled', () => {
    expect(() =>
      assertServerEnvironmentSecretCombinations({
        betterAuthSecrets: versionedSecret,
        calcomAllowLegacySharedWebhooks: 'false',
      })
    ).not.toThrow()
    expect(() =>
      assertServerEnvironmentSecretCombinations({
        betterAuthSecrets: versionedSecret,
        calcomAllowLegacySharedWebhooks: 'true',
      })
    ).toThrow('CALCOM_WEBHOOK_SECRET is required when CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=true')
    expect(() =>
      assertServerEnvironmentSecretCombinations({
        betterAuthSecrets: versionedSecret,
        calcomAllowLegacySharedWebhooks: 'true',
        calcomWebhookSecret: 'legacy-secret',
      })
    ).not.toThrow()
  })
})
