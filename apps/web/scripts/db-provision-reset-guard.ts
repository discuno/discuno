#!/usr/bin/env tsx

/**
 * One-time provisioning for the reset guard table. This does not alter app
 * data, but intentionally requires the target database name in the typed
 * confirmation because adding the marker authorizes future destructive resets.
 */

import { config } from 'dotenv'
import postgres from 'postgres'

type Environment = 'local' | 'preview' | 'test'

const environments = ['local', 'preview', 'test'] as const
const environment = process.argv[2] as Environment | undefined
if (!environment || !environments.includes(environment)) {
  throw new Error('Usage: db-provision-reset-guard.ts <local|preview|test>')
}

const envFile = {
  local: '.env.local',
  preview: '.env.preview',
  test: '.env.test',
}[environment]
config({ path: envFile, override: true })
config({ path: '.env' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error(`DATABASE_URL is not configured for ${environment}`)

const client = postgres(databaseUrl, { max: 1 })

try {
  const [identity] = await client<{ database_name: string; server_host: string }[]>`
    select current_database() as database_name, inet_server_addr()::text as server_host
  `
  if (!identity) throw new Error('Could not identify the reset-guard database')

  const expectedConfirmation = `PROVISION ${environment.toUpperCase()} ${identity.database_name}`
  const confirmation = process.argv.find(value => value.startsWith('--confirm='))?.slice(10)
  if (confirmation !== expectedConfirmation) {
    throw new Error(
      `Refusing to provision reset access for ${identity.server_host}/${identity.database_name}. ` +
        `Re-run with --confirm="${expectedConfirmation}" after verifying the target.`
    )
  }

  const marker = `discuno-${environment}-environment-v1`
  if (environment === 'test') {
    await client`
      create table if not exists _discuno_test_environment_guard (
        marker text primary key
      )
    `
    const existing = await client<{ marker: string }[]>`
      select marker from _discuno_test_environment_guard limit 1
    `
    if (existing[0] && existing[0].marker !== marker) {
      throw new Error('A different test reset marker already exists; refusing to overwrite it')
    }
    await client`
      insert into _discuno_test_environment_guard (marker)
      values (${marker})
      on conflict (marker) do nothing
    `
  } else {
    await client`
      create table if not exists _discuno_database_environment_guard (
        marker text primary key
      )
    `
    const existing = await client<{ marker: string }[]>`
      select marker from _discuno_database_environment_guard limit 1
    `
    if (existing[0] && existing[0].marker !== marker) {
      throw new Error('A different reset marker already exists; refusing to overwrite it')
    }
    await client`
      insert into _discuno_database_environment_guard (marker)
      values (${marker})
      on conflict (marker) do nothing
    `
  }

  console.log(
    `Provisioned the ${environment} reset guard for ${identity.server_host}/${identity.database_name}.`
  )
} finally {
  await client.end()
}
