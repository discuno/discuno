import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '~/env'
import * as schema from '~/server/db/schema/index'

// Keep a small reusable pool per Fluid Compute instance and close idle/old
// connections so deploys and traffic bursts do not exhaust Railway Postgres.
const sql = postgres(env.DATABASE_URL, {
  max: 5,
  idle_timeout: 5,
  connect_timeout: 10,
  max_lifetime: 30 * 60,
})
export const db = drizzle(sql, { schema, casing: 'snake_case' })
