import { config } from 'dotenv'
import { type Config } from 'drizzle-kit'

// Load preview environment variables
config({ path: '.env.preview', override: true })

export default {
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: 'snake_case',
  tablesFilter: ['discuno_*'],
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'index',
  },
} satisfies Config
