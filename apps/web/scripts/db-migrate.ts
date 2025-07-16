#!/usr/bin/env tsx

/**
 * Database Migration Script for Railway PostgreSQL
 *
 * Usage:
 *   pnpm db:migrate:local    - Run migrations for local development
 *   pnpm db:migrate:preview  - Run migrations for preview environment
 *   pnpm db:migrate:prod     - Run migrations for production (manual only)
 *
 * This script handles environment-specific database migrations
 * following Next.js 2025 and Drizzle ORM best practices.
 */

import { runMigrations } from '../src/lib/db/migrate'

type Environment = 'local' | 'preview' | 'production'

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required. Usage: tsx scripts/db-migrate.ts <environment>')
    console.error('   Valid environments: local, preview, production')
    process.exit(1)
  }

  if (!['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview, production')
    process.exit(1)
  }

  console.log(`🚀 Starting migration process for ${environment} environment`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log('─'.repeat(50))

  try {
    await runMigrations(environment)
    console.log('─'.repeat(50))
    console.log(`✨ Migration completed successfully for ${environment}`)
  } catch (error) {
    console.log('─'.repeat(50))
    console.error(`💥 Migration failed for ${environment}:`, error)
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}

export { main }
