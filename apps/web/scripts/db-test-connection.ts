#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 *
 * This script helps verify which database you're connecting to
 * and tests the connection before running any destructive operations.
 *
 * Usage:
 *   tsx scripts/db-test-connection.ts local
 *   tsx scripts/db-test-connection.ts preview
 *   tsx scripts/db-test-connection.ts production
 */

import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

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
    // Load environment-specific file first with override
    config({ path: envFile, override: true })

    // Load default .env as fallback for any missing variables
    config({ path: '.env' })
  } catch {
    console.log(`⚠️  Could not load ${envFile}, trying .env as fallback`)
    config({ path: '.env' })
  }
}

const testConnection = async (environment: Environment) => {
  console.log(`🔍 Testing ${environment} database connection...`)
  console.log('─'.repeat(60))

  // Load environment-specific config
  loadEnvironmentConfig(environment)

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL not found for ${environment} environment`)
  }

  // Parse database URL to show connection details (safely)
  const url = new URL(databaseUrl)
  const maskedPassword = url.password ? '*'.repeat(url.password.length) : 'none'

  console.log(`📋 Connection Details:`)
  console.log(`   Environment: ${environment}`)
  console.log(`   Host: ${url.hostname}`)
  console.log(`   Port: ${url.port}`)
  console.log(`   Database: ${url.pathname.slice(1)}`)
  console.log(`   Username: ${url.username}`)
  console.log(`   Password: ${maskedPassword}`)
  console.log('─'.repeat(60))

  // Test connection
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)

  try {
    // Test basic connection
    await db.execute(sql`SELECT 1 as test`)
    console.log('✅ Basic connection test: PASSED')

    // Get database info
    const dbInfo = await db.execute(sql`
      SELECT
        current_database() as database_name,
        current_user as username,
        version() as postgres_version,
        now() as current_time
    `)

    const row = dbInfo[0] as any
    console.log('📊 Database Info:')
    console.log(`   Database Name: ${row?.database_name ?? 'Unknown'}`)
    console.log(`   Connected User: ${row?.username ?? 'Unknown'}`)
    console.log(`   PostgreSQL Version: ${row?.postgres_version?.split?.(',')[0] ?? 'Unknown'}`)
    console.log(`   Server Time: ${row?.current_time ?? 'Unknown'}`)

    // Check for existing tables with our prefix
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'discuno_%'
      ORDER BY table_name
    `)

    console.log('─'.repeat(60))
    console.log(`📋 Existing Discuno Tables (${tables.length} found):`)
    if (tables.length > 0) {
      tables.forEach((table: any) => {
        console.log(`   • ${table.table_name}`)
      })
    } else {
      console.log('   No Discuno tables found (fresh database)')
    }

    // Count records in main tables if they exist
    const userCount = await db
      .execute(
        sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name = 'discuno_user'
    `
      )
      .then(async result => {
        const tableExists = (result[0] as any)?.count === '1'
        if (tableExists) {
          const users = await db.execute(sql`SELECT COUNT(*) as count FROM discuno_user`)
          return parseInt((users[0] as any)?.count ?? '0')
        }
        return 0
      })

    if (userCount > 0) {
      console.log('─'.repeat(60))
      console.log(`📊 Data Summary:`)
      console.log(`   Users: ${userCount}`)
    }

    console.log('─'.repeat(60))
    console.log(`✅ ${environment.toUpperCase()} database connection test completed successfully!`)
  } catch (error) {
    console.error(`❌ Connection test failed:`, error)
    throw error
  } finally {
    await client.end()
  }
}

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required.')
    console.error('Usage: tsx scripts/db-test-connection.ts <environment>')
    console.error('Valid environments: local, preview, production')
    process.exit(1)
  }

  if (!['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview, production')
    process.exit(1)
  }

  try {
    await testConnection(environment)
  } catch (error) {
    console.error(`💥 Connection test failed for ${environment}:`, error)
    process.exit(1)
  }
}

void main()
