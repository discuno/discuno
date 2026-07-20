#!/usr/bin/env tsx

/**
 * Database Push Script for Railway PostgreSQL
 *
 * Usage:
 *   pnpm db:push local    - Push schema for local development
 *   pnpm db:push preview  - Push schema for preview environment
 *   pnpm db:push prod     - Push schema for production
 *
 * This script handles environment-specific schema pushes
 * using drizzle-kit push.
 */

import { spawn } from 'child_process'
import { config } from 'dotenv'

type Environment = 'local' | 'preview' | 'production'

const loadEnvironmentConfig = (environment: Environment) => {
  const envFiles = {
    local: '.env.local',
    preview: '.env.preview',
    production: '.env.production',
  }

  const envFile = envFiles[environment]
  console.log(`📄 Loading environment config from: ${envFile}`)

  try {
    config({ path: envFile, override: true })
    config({ path: '.env' })
  } catch {
    console.log(`⚠️  Could not load ${envFile}, trying .env as fallback`)
    config({ path: '.env' })
  }
}

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required. Usage: tsx scripts/db-push.ts <environment>')
    console.error('   Valid environments: local, preview, production')
    process.exit(1)
  }

  if (!['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview, production')
    process.exit(1)
  }

  console.log(`🚀 Starting schema push for ${environment} environment`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log('─'.repeat(50))

  loadEnvironmentConfig(environment)

  // Drizzle configs are at root level
  const configFile = `../../drizzle.${environment}.config.ts`

  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const childProcess = spawn('pnpm', ['drizzle-kit', 'push', `--config=${configFile}`], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env },
      })

      childProcess.on('close', (code: number | null) => {
        resolve(code ?? 1)
      })

      childProcess.on('error', (error: Error) => {
        reject(error)
      })
    })

    if (exitCode !== 0) {
      throw new Error(`Schema push failed with exit code ${exitCode}`)
    }

    console.log('─'.repeat(50))
    // drizzle-kit exits with code 0 for both a successful push and a user-aborted
    // interactive prompt, so do not claim that changes were necessarily applied.
    console.log(`✨ Schema push process finished for ${environment}`)
  } catch (error) {
    console.log('─'.repeat(50))
    console.error(`💥 Schema push failed for ${environment}:`, error)
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}

export { main }
