#!/usr/bin/env tsx

/**
 * Database Seeding Script for Railway PostgreSQL
 *
 * Usage:
 *   pnpm db:seed:local    - Seed local development database
 *   pnpm db:seed:preview  - Seed preview environment database
 *
 * This script handles environment-specific database seeding
 * following Next.js 2025 and Drizzle ORM best practices.
 *
 * Production seeding is intentionally disabled for safety.
 */

import { seedDatabase } from '../src/lib/db/seed'

type Environment = 'local' | 'preview'

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error('❌ Environment is required. Usage: tsx scripts/db-seed.ts <environment>')
    console.error('   Valid environments: local, preview')
    console.error('   🚨 Production seeding is disabled for safety')
    process.exit(1)
  }

  if (!['local', 'preview'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview')
    console.error('   🚨 Production seeding is disabled for safety')
    process.exit(1)
  }

  console.log(`🌱 Starting seeding process for ${environment} environment`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log('🚨 This will add sample data to your database')
  console.log('─'.repeat(50))

  // Additional safety prompt for preview
  if (environment === 'preview') {
    console.log('⚠️  You are about to seed the PREVIEW environment')
    console.log('   This will add sample data to your staging database')
    console.log('   Make sure this is intended!')
    console.log('─'.repeat(50))
  }

  try {
    await seedDatabase(environment)
    console.log('─'.repeat(50))
    console.log(`🎉 Seeding completed successfully for ${environment}`)
    console.log('📊 Your database now contains sample data for development/testing')
    console.log('   - 30 mentor users added to college-mentors team')
    console.log('   - Posts, reviews, and complete relationship mappings')
    console.log('   - Schools, majors, and waitlist entries')
    console.log('   - Event types managed at team level (not per-user)')
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
