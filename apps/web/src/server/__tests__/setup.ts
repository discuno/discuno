import { execSync } from 'child_process'
import { afterAll, beforeAll, vi } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'

vi.mock('~/server/db', () => ({
  db: testDb,
}))

beforeAll(() => {
  execSync('pnpm db:reset:test', { stdio: 'inherit' })
}, 30000)

afterAll(async () => {
  await clearDatabase()
})
