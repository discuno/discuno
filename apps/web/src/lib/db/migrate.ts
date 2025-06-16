import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Migration utility for Railway PostgreSQL
 * Supports different environments based on NODE_ENV or explicit environment parameter
 */

type Environment = 'local' | 'preview' | 'production'

const getConnectionString = (environment?: Environment): string => {
  // Use explicit environment or fallback to local for development/test
  const targetEnv = environment

  // Use the environment-specific DATABASE_URL
  // Railway typically provides these as DATABASE_URL in each environment
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL environment variable is not set for environment: ${targetEnv}`)
  }

  return databaseUrl
}

const createMigrationConnection = (environment?: Environment) => {
  const connectionString = getConnectionString(environment)

  if (!connectionString) {
    throw new Error(
      `Database connection string not found for environment: ${environment ?? 'auto-detected'}`
    )
  }

  // Create connection with migration-specific settings
  const migrationClient = postgres(connectionString, {
    max: 1, // Single connection for migrations
    transform: postgres.camel, // Convert snake_case to camelCase
  })

  return { client: migrationClient, db: drizzle(migrationClient) }
}

export const runMigrations = async (environment?: Environment) => {
  const targetEnv = environment

  console.log(`🔄 Starting migrations for environment: ${targetEnv}`)
  console.log(`📂 Migration files location: ./drizzle`)

  const { client, db } = createMigrationConnection(environment)

  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log(`✅ Migrations completed successfully for ${targetEnv}`)
  } catch (error) {
    console.error(`❌ Migration failed for ${targetEnv}:`, error)
    throw error
  } finally {
    await client.end()
    console.log(`🔌 Database connection closed for ${targetEnv}`)
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = process.argv[2] as Environment | undefined

  if (environment && !['local', 'preview', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: local, preview, or production')
    process.exit(1)
  }

  runMigrations(environment)
    .then(() => {
      console.log('🎉 Migration process completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Migration process failed:', error)
      process.exit(1)
    })
}
