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
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const childProcess = spawn('pnpm', ['drizzle-kit', 'push', `--config=${configFile}`], {
          stdio: ['inherit', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: { ...process.env },
        })

        let stdout = ''
        let stderr = ''

        childProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString()
          console.log(data.toString())
        })

        childProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
          console.error(data.toString())
        })

        childProcess.on('close', (code: number | null) => {
          resolve({ code: code ?? 0, stdout, stderr })
        })

        childProcess.on('error', (error: Error) => {
          reject(error)
        })
      }
    )

    if (result.code !== 0) {
      throw new Error(`Schema push failed with exit code ${result.code}`)
    }

    console.log('─'.repeat(50))
    console.log(`✨ Schema push completed successfully for ${environment}`)
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
