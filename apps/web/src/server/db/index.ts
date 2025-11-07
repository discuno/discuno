import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '~/env'
import * as schema from '~/server/db/schema/index'

const sql = postgres(env.DATABASE_URL)
export const db = drizzle(sql, { schema, casing: 'snake_case' })
