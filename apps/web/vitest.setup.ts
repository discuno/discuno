import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Global test setup
beforeAll(() => {
  // Mock environment variables for tests
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
  vi.stubEnv('DATABASE_URL', 'mock://test')

  // Mock required client-side environment variables for Cal.com integration
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
  vi.stubEnv('NEXT_PUBLIC_X_CAL_ID', 'test-cal-id')
  vi.stubEnv('NEXT_PUBLIC_CALCOM_API_URL', 'https://api.cal.com/v2')
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLIC_KEY', 'pk_test_mock_stripe_key')

  // Mock additional required server environment variables
  vi.stubEnv('AUTH_DISCORD_ID', 'test-discord-id')
  vi.stubEnv('AUTH_DISCORD_SECRET', 'test-discord-secret')
  vi.stubEnv('AUTH_GOOGLE_ID', 'test-google-id')
  vi.stubEnv('AUTH_GOOGLE_SECRET', 'test-google-secret')
  vi.stubEnv('AUTH_EMAIL_FROM', 'test@example.com')
  vi.stubEnv('JWT_SECRET', 'test-jwt-secret')
  vi.stubEnv('SENDGRID_API_KEY', 'test-sendgrid-key')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock_stripe_secret')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_webhook_secret')
  vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'test-sentry-token')
  vi.stubEnv('AUTH_EMAIL_SERVER', 'test-email-server')
  vi.stubEnv('X_CAL_SECRET_KEY', 'test-cal-secret-key')
  vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/test')
  vi.stubEnv('SENTRY_ENVIRONMENT', 'test')
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<any>) => {
    const Component = fn()
    return Component
  },
}))

// Global mocks for DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
