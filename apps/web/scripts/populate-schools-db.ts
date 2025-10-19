#!/usr/bin/env tsx

/**
 * Script to populate schools from us_schools.json
 *
 * Usage:
 *   tsx scripts/populate-schools-db.ts <environment>
 *
 * Valid environments: local, preview, production
 */

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schools } from '../src/server/db/schema'
import schoolData from './us_schools_sorted.json'

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
    config({ path: envFile })
  } catch {
    console.log(`⚠️  Could not load ${envFile}, trying .env as fallback`)
    config({ path: '.env' })
  }
}

const main = async () => {
  const environment = process.argv[2] as Environment | undefined

  if (!environment) {
    console.error(
      '❌ Environment is required. Usage: tsx scripts/populate-schools-db.ts <environment>'
    )
    console.error('   Valid environments: local, preview, production')
    process.exit(1)
  }

  if (!['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Valid options: local, preview, production')
    process.exit(1)
  }

  console.log(`🏫 Starting school population for environment: ${environment}`)

  // Load environment configuration
  loadEnvironmentConfig(environment)

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL environment variable is not set for environment: ${environment}`)
  }

  // Create database connection
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client, { casing: 'snake_case' })

  try {
    // Map JSON to DB-compatible fields (snake_case)
    // Only filter out schools missing required fields (name and domainPrefix)
    // location, primaryColor, and secondaryColor can be null
    const allSchools = schoolData.map(school => ({
      name: school.name,
      domainPrefix: school.domainPrefix,
      location: school.location,
      primaryColor: school.primaryColor,
      secondaryColor: school.secondaryColor,
    }))

    const validSchools = allSchools.filter(
      school => Boolean(school.name) && Boolean(school.domainPrefix)
    )

    // Check for duplicate domainPrefix values
    const domainPrefixes = validSchools.map(s => s.domainPrefix)
    const uniqueDomainPrefixes = new Set(domainPrefixes)
    const duplicateCount = domainPrefixes.length - uniqueDomainPrefixes.size

    console.log(
      `📊 Found ${schoolData.length} schools in JSON, ${validSchools.length} valid for insert`
    )
    if (duplicateCount > 0) {
      console.log(
        `⚠️  Warning: ${duplicateCount} duplicate domainPrefix values found (will be skipped)`
      )
    }

    if (validSchools.length === 0) {
      console.log('❌ No valid schools found to insert')
      return
    }

    // Insert with conflict resolution (skip duplicates)
    await db.insert(schools).values(validSchools).onConflictDoNothing()

    console.log('✅ Schools populated successfully!')
    console.log(`📈 Inserted or skipped ${validSchools.length} schools`)

    const countResult = await db.$count(schools)
    console.log(`📊 Total schools in database: ${countResult}`)
  } catch (error) {
    console.error('❌ Failed to populate schools:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
