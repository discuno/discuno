import { config } from 'dotenv'
import { type Config } from 'drizzle-kit'

// Load test environment variables
config({ path: '.env.test', override: true })

export default {
  schema: './src/server/db/schema/index.ts',
  out: './drizzle/test',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: 'snake_case',
  tablesFilter: ['discuno_*'],
  verbose: true,
  strict: true,
} satisfies Config
