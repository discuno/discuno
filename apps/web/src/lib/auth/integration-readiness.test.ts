import { describe, expect, it } from 'vitest'
import { assertAuthIntegrationReadiness } from './integration-readiness'

const validEnvironment = {
  AUTH_GOOGLE_ID: 'google-client-id',
  AUTH_GOOGLE_SECRET: 'google-client-secret',
  AUTH_MICROSOFT_ENTRA_ID_ID: 'microsoft-client-id',
  AUTH_MICROSOFT_ENTRA_ID_SECRET: 'microsoft-client-secret',
  BETTER_AUTH_PRODUCTION_URL: 'https://discuno.com',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_TRUSTED_ORIGINS: 'https://discuno-preview.vercel.app,https://*.preview.discuno.com',
  BETTER_AUTH_URL: 'https://discuno.com',
  NEXT_PUBLIC_AUTH_GOOGLE_ID: 'google-client-id',
  NEXT_PUBLIC_BASE_URL: 'https://discuno.com',
  OAUTH_PROXY_SECRET: 'b'.repeat(32),
}

describe('authentication integration readiness', () => {
  it('accepts complete provider, proxy, URL, and trusted-origin configuration', () => {
    expect(() => assertAuthIntegrationReadiness(validEnvironment, 'production')).not.toThrow()
  })

  it('accepts a versioned Better Auth key ring without the legacy key', () => {
    expect(() =>
      assertAuthIntegrationReadiness(
        {
          ...validEnvironment,
          BETTER_AUTH_SECRET: undefined,
          BETTER_AUTH_SECRETS: `2:${'c'.repeat(32)},1:${'d'.repeat(32)}`,
        },
        'preview'
      )
    ).not.toThrow()
  })

  it.each([
    ['AUTH_GOOGLE_SECRET', undefined],
    ['AUTH_MICROSOFT_ENTRA_ID_ID', ''],
    ['OAUTH_PROXY_SECRET', 'too-short'],
  ])('rejects missing or weak required configuration for %s', (name, value) => {
    expect(() =>
      assertAuthIntegrationReadiness({ ...validEnvironment, [name]: value }, 'production')
    ).toThrow(name)
  })

  it('rejects a mismatched public Google client without exposing either identifier', () => {
    const publicIdentifier = 'private-public-client-id'
    const serverIdentifier = 'private-server-client-id'

    expect(() =>
      assertAuthIntegrationReadiness(
        {
          ...validEnvironment,
          AUTH_GOOGLE_ID: serverIdentifier,
          NEXT_PUBLIC_AUTH_GOOGLE_ID: publicIdentifier,
        },
        'production'
      )
    ).toThrow('AUTH_GOOGLE_ID and NEXT_PUBLIC_AUTH_GOOGLE_ID must match')

    try {
      assertAuthIntegrationReadiness(
        {
          ...validEnvironment,
          AUTH_GOOGLE_ID: serverIdentifier,
          NEXT_PUBLIC_AUTH_GOOGLE_ID: publicIdentifier,
        },
        'production'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      expect(message).not.toContain(publicIdentifier)
      expect(message).not.toContain(serverIdentifier)
    }
  })

  it('rejects shared-host wildcards and insecure deployed origins without echoing input', () => {
    const unsafeOrigin = 'https://private-project-*.vercel.app'
    expect(() =>
      assertAuthIntegrationReadiness(
        { ...validEnvironment, BETTER_AUTH_TRUSTED_ORIGINS: unsafeOrigin },
        'preview'
      )
    ).toThrow('Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 1')

    expect(() =>
      assertAuthIntegrationReadiness(
        { ...validEnvironment, BETTER_AUTH_URL: 'http://private-preview.example.com' },
        'preview'
      )
    ).toThrow('BETTER_AUTH_URL must be a safe HTTP(S) origin')

    try {
      assertAuthIntegrationReadiness(
        { ...validEnvironment, BETTER_AUTH_TRUSTED_ORIGINS: unsafeOrigin },
        'preview'
      )
    } catch (error) {
      expect(error instanceof Error ? error.message : String(error)).not.toContain(unsafeOrigin)
    }
  })
})
