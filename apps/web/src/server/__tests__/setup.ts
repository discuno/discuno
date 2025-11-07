import { afterAll, vi } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'

// Mock server-only module to allow testing server components
vi.mock('server-only', () => ({}))

vi.mock('~/server/db', () => ({
  db: testDb,
}))

// Database reset is handled in global-setup.ts to prevent race conditions
// when multiple test files run in parallel

afterAll(async () => {
  await clearDatabase()
})
