import { existsSync } from 'fs'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Load .env.test if it exists
const testEnvPath = '.env.test'
const hasTestEnv = existsSync(testEnvPath)

if (hasTestEnv) {
  dotenv.config({ path: testEnvPath, override: true })
}

// Exclude integration tests if no test database is configured
const excludePatterns = ['node_modules/', '.next/', 'dist/', 'coverage/']
if (!hasTestEnv || !process.env.DATABASE_URL) {
  excludePatterns.push('**/__tests__/integration/**')
  console.warn('⚠️  Skipping integration tests: No .env.test file found or DATABASE_URL not set')
}

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: hasTestEnv ? ['./src/server/__tests__/setup.ts'] : [],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: '../../coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/instrumentation*.ts',
        'sentry*.config.ts',
        'src/env.js',
        'drizzle/',
        '**/*.test.*',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: excludePatterns,
  },
})
