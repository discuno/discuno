#!/usr/bin/env tsx

import { list } from '@vercel/blob'
import { Redis } from '@upstash/redis'
import { config } from 'dotenv'
import postgres from 'postgres'
import Stripe from 'stripe'
import { assertAuthIntegrationReadiness } from '../src/lib/auth/integration-readiness'

type Environment = 'local' | 'preview' | 'production'

const environment = (process.argv[2] ?? 'local') as Environment
const envFiles: Record<Environment, string> = {
  local: '.env.local',
  preview: '.env.preview',
  production: '.env.production',
}

if (!(environment in envFiles)) {
  throw new Error('Environment must be local, preview, or production.')
}

config({ path: envFiles[environment], override: true, quiet: true })
config({ path: '.env', quiet: true })

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

const checks: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: 'Better Auth / identity provider configuration',
    run: async () => {
      assertAuthIntegrationReadiness(process.env, environment)
    },
  },
  {
    name: 'PostgreSQL',
    run: async () => {
      const sql = postgres(required('DATABASE_URL'), { max: 1 })
      try {
        await sql`SELECT 1`
      } finally {
        await sql.end()
      }
    },
  },
  {
    name: 'Cal.com OAuth configuration/API',
    run: async () => {
      const apiUrl = new URL(required('CALCOM_API_URL'))
      new URL(required('CALCOM_APP_URL'))
      new URL(required('CALCOM_OAUTH_REDIRECT_URI'))
      required('CALCOM_OAUTH_CLIENT_ID')
      required('CALCOM_OAUTH_CLIENT_SECRET')
      const legacySharedWebhooks = process.env.CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS ?? 'false'
      if (legacySharedWebhooks !== 'true' && legacySharedWebhooks !== 'false') {
        throw new Error('CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS must be true or false')
      }
      if (legacySharedWebhooks === 'true') required('CALCOM_WEBHOOK_SECRET')
      const encryptionKey = Buffer.from(required('CALCOM_TOKEN_ENCRYPTION_KEY'), 'base64')
      if (encryptionKey.length !== 32) {
        throw new Error('CALCOM_TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
      }

      // A deliberately invalid bearer token verifies that the configured API host
      // is reachable without consuming or rotating a mentor's OAuth credentials.
      const response = await fetch(new URL('me', `${apiUrl.toString().replace(/\/$/, '')}/`), {
        headers: { Authorization: 'Bearer discuno-connectivity-probe' },
      })
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Unexpected probe response: HTTP ${response.status}`)
      }
    },
  },
  {
    name: 'Stripe',
    run: async () => {
      const stripe = new Stripe(required('STRIPE_SECRET_KEY'), {
        apiVersion: '2026-06-24.dahlia',
      })
      await stripe.balance.retrieve()
    },
  },
  {
    name: 'Upstash Redis',
    run: async () => {
      const redis = new Redis({
        url: required('UPSTASH_REDIS_REST_URL'),
        token: required('UPSTASH_REDIS_REST_TOKEN'),
      })
      await redis.ping()
    },
  },
  {
    name: 'Vercel Blob',
    run: async () => {
      await list({ limit: 1, token: required('BLOB_READ_WRITE_TOKEN') })
    },
  },
  {
    name: 'Resend',
    run: async () => {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${required('RESEND_API_KEY')}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    },
  },
  {
    name: 'PostHog configuration',
    run: async () => {
      new URL(required('NEXT_PUBLIC_POSTHOG_HOST'))
      required('NEXT_PUBLIC_POSTHOG_KEY')
    },
  },
  {
    name: 'Inngest configuration',
    run: async () => {
      required('INNGEST_EVENT_KEY')
      required('INNGEST_SIGNING_KEY')
    },
  },
]

const results = await Promise.all(
  checks.map(async check => {
    try {
      await check.run()
      return { name: check.name, ok: true }
    } catch (error) {
      return {
        name: check.name,
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
)

for (const result of results) {
  console.log(`${result.ok ? '✓' : '✗'} ${result.name}${result.ok ? '' : `: ${result.error}`}`)
}

if (results.some(result => !result.ok)) process.exitCode = 1
