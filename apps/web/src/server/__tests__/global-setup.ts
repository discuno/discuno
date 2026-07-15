import { execFileSync } from 'node:child_process'

/**
 * Global setup runs once before all test files
 * This prevents race conditions from multiple test files
 * trying to reset the database simultaneously
 */
export default function setup() {
  console.log('🔄 Running global test setup: resetting database...')
  // The database-side marker is the safety boundary. Supplying the exact test
  // confirmation keeps CI non-interactive without weakening the reset script
  // for local/preview targets.
  execFileSync('pnpm', ['db:reset:test', '--', '--confirm=RESET TEST'], { stdio: 'inherit' })
  console.log('✅ Global test setup complete')
}
