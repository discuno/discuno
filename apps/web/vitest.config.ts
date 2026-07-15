import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/instrumentation*.ts',
        'src/env.js',
        'drizzle/',
        '**/*.test.*',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        // Keep a small cross-platform margin below the measured baseline while
        // still making CI reject material coverage regressions.
        statements: 60,
        branches: 45,
        functions: 55,
        lines: 60,
      },
    },
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'src/server/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'node_modules/',
      '.next/',
      'dist/',
      'coverage/',
    ],
  },
})
