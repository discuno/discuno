import { config } from 'dotenv'
import { type Config } from 'drizzle-kit'

// Load production environment variables
config({ path: '.env.production', override: true })

export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
  casing: 'snake_case',
  tablesFilter: ['discuno_*'],
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'index',
  },
} satisfies Config
