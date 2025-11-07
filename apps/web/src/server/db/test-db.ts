import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '~/server/db/schema/index'

config({ path: '.env.test', override: true })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.test')
}

const client = postgres(process.env.DATABASE_URL)
export const testDb = drizzle(client, { schema, casing: 'snake_case' })
