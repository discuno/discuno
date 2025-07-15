import { type Config } from 'drizzle-kit'

import { env } from '~/env'

export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  casing: 'snake_case',
  tablesFilter: ['discuno_*'],
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'index',
  },
} satisfies Config
