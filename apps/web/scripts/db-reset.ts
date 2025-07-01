#!/usr/bin/env tsx

/**
 * Database Reset Script for Railway PostgreSQL
 *
 * Usage:
 *   pnpm db:reset:local    - Reset and reseed local development database
 *   pnpm db:reset:preview  - Reset and reseed preview environment database
 *
 * This script will:
 * 1. Drop all tables
 * 2. Push schema directly (more reliable than migrations for reset)
 * 3. Seed with sample data
 *
 * Production reset is intentionally disabled for safety.
 */

import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { seedDatabase } from '../src/lib/db/seed'

type Environment = 'local' | 'preview'

const loadEnvironmentConfig = (environment: Environment) => {
  const envFiles = {
    local: '.env.local',
    preview: '.env.preview',
  }

  const envFile = envFiles[environment]
  console.log(`📄 Loading environment config from: ${envFile}`)

  try {
    // Load environment-specific file first with override
    config({ path: envFile, override: true })

    // Load default .env as fallback for any missing variables
    config({ path: '.env' })
  } catch {
    console.log(`⚠️  Could not load ${envFile}, trying .env as fallback`)
    config({ path: '.env' })
  }
}

const createResetConnection = (environment: Environment) => {
  // Load the appropriate environment configuration
  loadEnvironmentConfig(environment)

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL environment variable is not set for environment: ${environment}`)
  }

  const resetClient = postgres(databaseUrl, {
    max: 1,
    transform: postgres.camel,
  })

  return { client: resetClient, db: drizzle(resetClient) }
}

const dropAllTables = async (environment: Environment) => {
  console.log(`🗑️  Dropping all tables in ${environment} database...`)

  const { client, db } = createResetConnection(environment)

  try {
    // First, disable foreign key checks temporarily to avoid dependency issues
    await db.execute(sql`SET session_replication_role = replica;`)

    // Get all tables with the discuno prefix
    const tables = await db.execute(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename LIKE 'discuno_%'
      ORDER BY tablename;
    `)

    const tableRows = Array.from(tables)

    if (tableRows.length === 0) {
      console.log('ℹ️  No tables found to drop')
      return
    }

    console.log(`📋 Found ${tableRows.length} tables to drop:`)
    tableRows.forEach((row: any) => {
      console.log(`   - ${row.tablename}`)
    })

    // Use transaction for atomic drop operation
    await db.transaction(async tx => {
      // Drop all tables with CASCADE to handle dependencies
      for (const row of tableRows) {
        const tableName = (row as any).tablename
        console.log(`   Dropping table: ${tableName}`)
        await tx.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`))
      }

      // Also drop any sequences that might be left behind
      const sequences = await tx.execute(sql`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        AND sequence_name LIKE 'discuno_%';
      `)

      for (const seqRow of sequences) {
        const sequenceName = (seqRow as any).sequence_name
        console.log(`   Dropping sequence: ${sequenceName}`)
        await tx.execute(sql.raw(`DROP SEQUENCE IF EXISTS "${sequenceName}" CASCADE;`))
      }
    })

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = DEFAULT;`)

    console.log(`✅ Successfully dropped ${tableRows.length} tables and associated sequences`)
  } catch (error) {
    console.error(`❌ Failed to drop tables:`, error)
    // Try to re-enable foreign key checks even if drop failed
    try {
      await db.execute(sql`SET session_replication_role = DEFAULT;`)
    } catch {
      // Ignore errors when trying to reset replication role
    }
    throw error
  } finally {
    await client.end()
  }
}

const pushSchema = async (environment: Environment) => {
  console.log(`🚀 Pushing schema to ${environment} database...`)

  // Load environment config to ensure DATABASE_URL is set for drizzle-kit
  loadEnvironmentConfig(environment)

  try {
    const { spawn } = await import('child_process')

    // Determine config file based on environment
    const configFile =
      environment === 'local' ? 'drizzle.local.config.ts' : 'drizzle.preview.config.ts'

    console.log(`📂 Using config file: ${configFile}`)

    // Set environment variable for the child process
    const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL }

    // Use spawn to run drizzle-kit push with proper stdio handling
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const childProcess = spawn('pnpm', ['drizzle-kit', 'push', `--config=${configFile}`], {
          stdio: ['inherit', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env,
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

    console.log(`✅ Schema pushed successfully to ${environment} database`)
  } catch (error) {
    console.error(`❌ Failed to push schema to ${environment}:`, error)
    throw error
  }
}

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required. Usage: tsx scripts/db-reset.ts <environment>')
    console.error('   Valid environments: local, preview')
    console.error('   🚨 Production reset is disabled for safety')
    process.exit(1)
  }

  if (!['local', 'preview'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview')
    console.error('   🚨 Production reset is disabled for safety')
    process.exit(1)
  }

  console.log(`🔄 Starting database reset for ${environment} environment`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log('⚠️  This will DESTROY ALL DATA in your database and recreate it')
  console.log('─'.repeat(60))

  // Additional safety prompt for preview
  if (environment === 'preview') {
    console.log('🚨 You are about to RESET the PREVIEW environment database')
    console.log('   This will PERMANENTLY DELETE all data!')
    console.log('   Make sure this is really what you want to do!')
    console.log('─'.repeat(60))
  }

  try {
    // Step 1: Drop all tables
    await dropAllTables(environment)

    console.log('─'.repeat(60))

    // Step 2: Push schema (more reliable than migrations for reset)
    console.log('🚀 Pushing schema...')
    await pushSchema(environment)

    console.log('─'.repeat(60))

    // Step 3: Seed database
    console.log('🌱 Seeding database...')
    await seedDatabase(environment)

    console.log('─'.repeat(60))
    console.log(`🎉 Database reset completed successfully for ${environment}`)
    console.log('📊 Your database has been reset and seeded with fresh sample data')
  } catch (error) {
    console.log('─'.repeat(60))
    console.error(`💥 Database reset failed for ${environment}:`, error)
    console.error('🔧 You may need to manually check your database state')
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}

export { main }
