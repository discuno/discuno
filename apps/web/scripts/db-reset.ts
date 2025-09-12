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
import Stripe from 'stripe'
import { seedDatabase } from '~/lib/db/seed'
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

  // Create a new client and drizzle instance for this environment
  const resetClient = postgres(databaseUrl, {
    max: 1,
  })

  const db = drizzle(resetClient, { casing: 'snake_case' })

  return { client: resetClient, db }
}

const dropAllTables = async (environment: Environment) => {
  console.log(`🗑️  Dropping all tables in ${environment} database...`)

  const { client, db } = createResetConnection(environment)

  try {
    // Step 0: Clean up Cal.com team memberships for existing local tokens
    console.log('🌐 Cleaning up Cal.com team memberships...')
    const calcomApiBase = process.env.NEXT_PUBLIC_CALCOM_API_URL
    const calcomClientId = process.env.NEXT_PUBLIC_X_CAL_ID
    const calcomSecretKey = process.env.X_CAL_SECRET_KEY
    const calcomOrgId = process.env.CALCOM_ORG_ID
    const collegeMentorTeamId = process.env.COLLEGE_MENTOR_TEAM_ID
    if (!calcomClientId || !calcomSecretKey || !calcomOrgId || !collegeMentorTeamId) {
      console.warn('⚠️ Missing Cal.com credentials. Skipping Cal.com cleanup.')
    } else {
      try {
        // Step 0a: Fetch all team memberships to get membership IDs
        console.log('📋 Fetching team memberships...')
        const membershipsResponse = await fetch(
          `${calcomApiBase}/organizations/${calcomOrgId}/teams/${collegeMentorTeamId}/memberships`,
          {
            method: 'GET',
            headers: {
              'x-cal-secret-key': calcomSecretKey,
              'x-cal-client-id': calcomClientId,
            },
          }
        )

        if (!membershipsResponse.ok) {
          const errorText = await membershipsResponse.text()
          console.error(
            `Failed to fetch team memberships: ${membershipsResponse.status} ${errorText}`
          )
        } else {
          const membershipsData = await membershipsResponse.json()

          if (membershipsData.status === 'success' && Array.isArray(membershipsData.data)) {
            const memberships = membershipsData.data
            console.log(`Found ${memberships.length} team memberships to clean up`)

            // Step 0b: Delete each membership (except OWNER role to avoid breaking the team)
            for (const membership of memberships) {
              try {
                // Skip OWNER memberships to avoid breaking the team
                if (membership.role === 'OWNER') {
                  console.log(`Skipping OWNER membership for user ${membership.user.email}`)
                  continue
                }

                console.log(
                  `Removing membership ${membership.id} for user ${membership.user.email}`
                )

                const deleteMembershipResponse = await fetch(
                  `${calcomApiBase}/organizations/${calcomOrgId}/teams/${collegeMentorTeamId}/memberships/${membership.id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'x-cal-secret-key': calcomSecretKey,
                      'x-cal-client-id': calcomClientId,
                    },
                  }
                )

                if (!deleteMembershipResponse.ok) {
                  const deleteErrorText = await deleteMembershipResponse.text()
                  console.error(
                    `Failed to delete membership ${membership.id}: ${deleteMembershipResponse.status} ${deleteErrorText}`
                  )
                } else {
                  console.log(`Successfully deleted membership ${membership.id}`)
                }

                // Step 0c: Also delete the Cal.com user if possible
                try {
                  const userResponse = await fetch(
                    `${calcomApiBase}/oauth-clients/${calcomClientId}/users/${membership.userId}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'x-cal-secret-key': calcomSecretKey,
                      },
                    }
                  )

                  if (!userResponse.ok) {
                    const userErrorText = await userResponse.text()
                    console.error(
                      `Failed to delete Cal.com user ${membership.userId}: ${userResponse.status} ${userErrorText}`
                    )
                  } else {
                    console.log(`Successfully deleted Cal.com user ${membership.userId}`)
                  }
                } catch (userError) {
                  console.error(`Error deleting Cal.com user ${membership.userId}:`, userError)
                }
              } catch (membershipError) {
                console.error(`Error processing membership ${membership.id}:`, membershipError)
              }
            }
          } else {
            console.warn('Unexpected memberships response format:', membershipsData)
          }
        }
      } catch (error) {
        console.error('Error during Cal.com cleanup:', error)
      }
    }
    // Step 0a: Cleanup Stripe Connect test accounts
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    const stripe = new Stripe(stripeSecretKey)
    console.log('💳 Cleaning up Stripe Connect test accounts...')
    try {
      // Fetch Stripe account IDs from DB
      const accounts = await db.execute(
        sql`SELECT stripe_account_id FROM discuno_mentor_stripe_account`
      )
      for (const row of accounts) {
        const acctId = row.stripe_account_id
        try {
          console.log(`Deleting Stripe account ${acctId}`)
          await stripe.accounts.del(acctId as string)
          console.log(`Deleted Stripe account ${acctId}`)
        } catch (err) {
          console.error(`Error deleting Stripe account ${acctId}:`, err)
        }
      }
    } catch (err) {
      console.error('Error fetching Stripe Connect accounts for cleanup:', err)
    }
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
    tableRows.forEach(row => {
      console.log(`   - ${row.tablename}`)
    })

    // Use transaction for atomic drop operation
    await db.transaction(async tx => {
      // Drop all tables with CASCADE to handle dependencies
      for (const row of tableRows) {
        const tableName = row.tablename
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
        const sequenceName = seqRow.sequence_name
        console.log(`   Dropping sequence: ${sequenceName}`)
        await tx.execute(sql.raw(`DROP SEQUENCE IF EXISTS "${sequenceName}" CASCADE;`))
      }
      // Drop enum types to match updated schema
      console.log(
        '   Dropping enum types: stripe_account_status, school_year, booking_status, payment_status, stripe_payment_status, analytics_event_type'
      )
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."stripe_account_status" CASCADE;`))
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."school_year" CASCADE;`))
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."booking_status" CASCADE;`))
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."payment_status" CASCADE;`))
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."stripe_payment_status" CASCADE;`))
      await tx.execute(sql.raw(`DROP TYPE IF EXISTS public."analytics_event_type" CASCADE;`))
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
    // Ensure environment is loaded again before seeding
    loadEnvironmentConfig(environment)
    await seedDatabase(environment)

    console.log('─'.repeat(60))
    console.log(`🎉 Database reset completed successfully for ${environment}`)
    console.log('📊 Your database has been reset and seeded with fresh sample data')
    console.log('   - 30 mentor users added to college-mentors team')
    console.log('   - Posts, reviews, and complete relationship mappings')
    console.log('   - Schools, majors, and waitlist entries')
    console.log('   - Event types managed at team level (not per-user)')
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
