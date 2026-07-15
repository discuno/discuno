import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'
import {
  assertServerEnvironmentSecretCombinations,
  isValidConfiguredTrustedOrigins,
} from './lib/auth/environment-validation.js'

const encoded32ByteKey = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/, 'Must be a canonical base64-encoded 32-byte key')
  .refine(value => Buffer.from(value, 'base64').length === 32, 'Must decode to exactly 32 bytes')

const versionedAuthSecrets = z.string().refine(value => {
  const versions = new Set()
  const entries = value.split(',')
  if (entries.length === 0) return false

  for (const rawEntry of entries) {
    const entry = rawEntry.trim()
    const separatorIndex = entry.indexOf(':')
    if (separatorIndex <= 0) return false
    const rawVersion = entry.slice(0, separatorIndex).trim()
    const secret = entry.slice(separatorIndex + 1).trim()
    if (!/^\d+$/.test(rawVersion) || secret.length < 32) return false
    const version = Number(rawVersion)
    if (!Number.isSafeInteger(version) || versions.has(version)) return false
    versions.add(version)
  }

  return true
}, 'Must use comma-separated <version>:<32+ character secret> entries with unique versions')

const skipEnvironmentValidation = !!process.env.SKIP_ENV_VALIDATION

if (!skipEnvironmentValidation && typeof window === 'undefined') {
  assertServerEnvironmentSecretCombinations({
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthSecrets: process.env.BETTER_AUTH_SECRETS,
    calcomAllowLegacySharedWebhooks: process.env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS,
    calcomWebhookSecret: process.env.CALCOM_WEBHOOK_SECRET,
  })
}

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    AUTH_EMAIL_FROM: z.string(),
    ADMIN_ALERT_EMAIL: z.email().default('support@discuno.com'),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    STRIPE_SECRET_KEY: z
      .string()
      .regex(/^(?:sk|rk)_(?:test|live)_/, 'Must be a Stripe test or live secret/restricted key'),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_CONNECT_WEBHOOK_SECRET: z.string(),
    PAYMENTS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform(value => value === 'true'),
    CRON_SECRET: z.string(),
    CALCOM_API_URL: z.url().default('https://api.cal.com/v2'),
    CALCOM_APP_URL: z.url().default('https://app.cal.com'),
    CALCOM_OAUTH_CLIENT_ID: z.string().min(1),
    CALCOM_OAUTH_CLIENT_SECRET: z.string().min(16),
    CALCOM_OAUTH_CLIENT_SECRET_FALLBACK: z.string().min(16).optional(),
    CALCOM_OAUTH_REDIRECT_URI: z.url(),
    CALCOM_TOKEN_ENCRYPTION_KEY: encoded32ByteKey,
    CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS: encoded32ByteKey.optional(),
    CALCOM_WEBHOOK_URL: z.url().optional(),
    AUTH_MICROSOFT_ENTRA_ID_ID: z.string(),
    AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string(),
    BLOB_READ_WRITE_TOKEN: z.string(),
    CALCOM_WEBHOOK_SECRET: z.string().min(1).optional(),
    CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS: z
      .enum(['true', 'false'])
      .default('false')
      .transform(value => value === 'true'),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    RESEND_API_KEY: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_SECRETS: versionedAuthSecrets.optional(),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_PRODUCTION_URL: z.url().default('https://discuno.com'),
    BETTER_AUTH_TRUSTED_ORIGINS: z
      .string()
      .refine(isValidConfiguredTrustedOrigins, 'Origins must be safe HTTP(S) origin patterns')
      .optional(),
    OAUTH_PROXY_SECRET: z.string().min(32),
    INNGEST_SIGNING_KEY: z.string(),
    INNGEST_EVENT_KEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_BASE_URL: z.url(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_POSTHOG_UI_HOST: z.string(),
    NEXT_PUBLIC_AUTH_GOOGLE_ID: z.string(),
  },

  /**
   *  You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
    ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    CALCOM_API_URL: process.env.CALCOM_API_URL,
    CALCOM_APP_URL: process.env.CALCOM_APP_URL,
    CALCOM_OAUTH_CLIENT_ID: process.env.CALCOM_OAUTH_CLIENT_ID,
    CALCOM_OAUTH_CLIENT_SECRET: process.env.CALCOM_OAUTH_CLIENT_SECRET,
    CALCOM_OAUTH_CLIENT_SECRET_FALLBACK: process.env.CALCOM_OAUTH_CLIENT_SECRET_FALLBACK,
    CALCOM_OAUTH_REDIRECT_URI: process.env.CALCOM_OAUTH_REDIRECT_URI,
    CALCOM_TOKEN_ENCRYPTION_KEY: process.env.CALCOM_TOKEN_ENCRYPTION_KEY,
    CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS: process.env.CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS,
    CALCOM_WEBHOOK_URL: process.env.CALCOM_WEBHOOK_URL,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    AUTH_MICROSOFT_ENTRA_ID_ID: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    AUTH_MICROSOFT_ENTRA_ID_SECRET: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    CALCOM_WEBHOOK_SECRET: process.env.CALCOM_WEBHOOK_SECRET,
    CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS: process.env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_UI_HOST: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
    NEXT_PUBLIC_AUTH_GOOGLE_ID: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_SECRETS: process.env.BETTER_AUTH_SECRETS,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_PRODUCTION_URL: process.env.BETTER_AUTH_PRODUCTION_URL,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    OAUTH_PROXY_SECRET: process.env.OAUTH_PROXY_SECRET,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: skipEnvironmentValidation,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
