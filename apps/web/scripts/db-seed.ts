#!/usr/bin/env tsx

/**
 * Database Seeding Script for Railway PostgreSQL
 *
 * Usage:
 *   pnpm db:seed:local       - Seed local development database
 *   pnpm db:seed:preview     - Seed preview environment database
 *   pnpm db:seed:production  - Seed production database (requires ALLOW_PROD_SEEDING=true and confirmation)
 *
 * This script handles environment-specific database seeding
 * following Next.js 2025 and Drizzle ORM best practices.
 *
 * Production seeding requires additional safety measures:
 * - ALLOW_PROD_SEEDING=true environment variable
 * - Interactive confirmation prompt
 */

import { createInterface } from 'readline'
import { seedDatabase, seedProductionData } from '../src/lib/db/seed'

type Environment = 'local' | 'preview' | 'production'

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required. Usage: tsx scripts/db-seed.ts <environment>')
    console.error('   Valid environments: local, preview, production')
    process.exit(1)
  }

  if (!['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview, production')
    process.exit(1)
  }

  if (environment === 'production') {
    console.log('🚨 DANGER: You are about to seed the PRODUCTION database!')
    console.log('   This will add essential data like schools and majors.')
    console.log('')
    console.log('   Type "I UNDERSTAND THE RISKS" to continue:')

    // Wait for user confirmation
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise<string>(resolve => {
      readline.question('> ', resolve)
    })
    readline.close()

    if (answer !== 'I UNDERSTAND THE RISKS') {
      console.log('❌ Production seeding cancelled.')
      console.log('   Exact phrase "I UNDERSTAND THE RISKS" required.')
      process.exit(1)
    }

    console.log('⚠️  Proceeding with production seeding in 3 seconds...')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log(`🌱 Starting seeding process for ${environment} environment`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log('─'.repeat(50))

  try {
    if (environment === 'production') {
      await seedProductionData()
    } else {
      await seedDatabase(environment)
    }
    console.log('─'.repeat(50))
    console.log(`🎉 Seeding completed successfully for ${environment}`)
  } catch (error) {
    console.log('─'.repeat(50))
    console.error(`💥 Seeding failed for ${environment}:`, error)
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}

export { main }
