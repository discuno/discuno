import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

dotenv.config({ path: '.env.test', override: false })

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
    environment: 'node',
    setupFiles: ['./src/server/__tests__/setup.ts'],
    globalSetup: ['./src/server/__tests__/global-setup.ts'],
    include: ['src/server/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    maxWorkers: 1,
  },
})
