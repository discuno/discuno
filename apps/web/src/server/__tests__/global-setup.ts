import { execSync } from 'child_process'

/**
 * Global setup runs once before all test files
 * This prevents race conditions from multiple test files
 * trying to reset the database simultaneously
 */
export default function setup() {
  console.log('🔄 Running global test setup: resetting database...')
  execSync('pnpm db:reset:test', { stdio: 'inherit' })
  console.log('✅ Global test setup complete')
}
