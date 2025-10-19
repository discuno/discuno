import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '~/server/db/schema'

// Load .env.test if DATABASE_URL is not already set (e.g., in CI)
if (!process.env.DATABASE_URL) {
  config({ path: '.env.test', override: true })
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment or .env.test')
}

const client = postgres(process.env.DATABASE_URL)
export const testDb = drizzle(client, { schema, casing: 'snake_case' })
