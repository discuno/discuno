#!/usr/bin/env tsx

import { list } from '@vercel/blob'
import { Redis } from '@upstash/redis'
import { config } from 'dotenv'
import postgres from 'postgres'
import Stripe from 'stripe'

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
    name: 'Cal.com',
    run: async () => {
      const apiUrl = required('NEXT_PUBLIC_CALCOM_API_URL')
      const orgId = required('CALCOM_ORG_ID')
      const response = await fetch(`${apiUrl}/organizations/${orgId}/users?take=1`, {
        headers: {
          'x-cal-client-id': required('NEXT_PUBLIC_X_CAL_ID'),
          'x-cal-secret-key': required('X_CAL_SECRET_KEY'),
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
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
    name: 'Sentry',
    run: async () => {
      const response = await fetch('https://sentry.io/api/0/organizations/', {
        headers: { Authorization: `Bearer ${required('SENTRY_AUTH_TOKEN')}` },
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
