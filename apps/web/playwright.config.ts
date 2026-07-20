import { defineConfig, devices } from '@playwright/test'

const localBaseURL = 'http://127.0.0.1:3100'
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = configuredBaseURL ?? localBaseURL

export default defineConfig({
  testDir: './e2e',
  outputDir: '../../test-results/playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: '../../playwright-report' }]]
    : 'list',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: configuredBaseURL
    ? undefined
    : {
        command: 'pnpm dev --hostname 127.0.0.1 --port 3100',
        url: `${localBaseURL}/auth`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
          ...process.env,
          SKIP_ENV_VALIDATION: '1',
          AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? 'discuno-e2e-google-client',
          AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? 'discuno-e2e-google-secret',
          AUTH_MICROSOFT_ENTRA_ID_ID:
            process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? 'discuno-e2e-microsoft-client',
          AUTH_MICROSOFT_ENTRA_ID_SECRET:
            process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? 'discuno-e2e-microsoft-secret',
          AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM ?? 'Discuno <e2e@discuno.test>',
          BETTER_AUTH_SECRET:
            process.env.BETTER_AUTH_SECRET ?? 'discuno-e2e-secret-at-least-32-characters',
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? localBaseURL,
          BETTER_AUTH_PRODUCTION_URL: process.env.BETTER_AUTH_PRODUCTION_URL ?? localBaseURL,
          BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? localBaseURL,
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? 'sk_test_discuno_e2e',
          STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_discuno_e2e',
          STRIPE_CONNECT_WEBHOOK_SECRET:
            process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? 'whsec_connect_discuno_e2e',
          CRON_SECRET: process.env.CRON_SECRET ?? 'discuno-e2e-cron-secret',
          CALCOM_API_URL: process.env.CALCOM_API_URL ?? 'https://api.cal.com/v2',
          CALCOM_APP_URL: process.env.CALCOM_APP_URL ?? 'https://app.cal.com',
          CALCOM_OAUTH_CLIENT_ID: process.env.CALCOM_OAUTH_CLIENT_ID ?? 'discuno-e2e-cal-client',
          CALCOM_OAUTH_CLIENT_SECRET:
            process.env.CALCOM_OAUTH_CLIENT_SECRET ?? 'discuno-e2e-cal-client-secret',
          CALCOM_OAUTH_REDIRECT_URI:
            process.env.CALCOM_OAUTH_REDIRECT_URI ??
            `${localBaseURL}/api/integrations/calcom/callback`,
          CALCOM_TOKEN_ENCRYPTION_KEY:
            process.env.CALCOM_TOKEN_ENCRYPTION_KEY ??
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          CALCOM_WEBHOOK_URL: process.env.CALCOM_WEBHOOK_URL ?? `${localBaseURL}/api/webhooks/cal`,
          CALCOM_WEBHOOK_SECRET:
            process.env.CALCOM_WEBHOOK_SECRET ?? 'discuno-e2e-cal-webhook-secret',
          BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ?? 'vercel_blob_rw_discuno_e2e',
          UPSTASH_REDIS_REST_URL:
            process.env.UPSTASH_REDIS_REST_URL ?? 'https://discuno-e2e.upstash.io',
          UPSTASH_REDIS_REST_TOKEN:
            process.env.UPSTASH_REDIS_REST_TOKEN ?? 'discuno-e2e-redis-token',
          RESEND_API_KEY: process.env.RESEND_API_KEY ?? 're_discuno_e2e',
          INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY ?? 'discuno-e2e-inngest-event',
          INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY ?? 'signkey-test-discuno-e2e',
          OAUTH_PROXY_SECRET:
            process.env.OAUTH_PROXY_SECRET ?? 'discuno-e2e-oauth-proxy-secret-32-chars',
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? localBaseURL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? localBaseURL,
          NEXT_PUBLIC_STRIPE_PUBLIC_KEY:
            process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? 'pk_test_discuno_e2e',
          NEXT_PUBLIC_AUTH_GOOGLE_ID:
            process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID ?? 'discuno-e2e-google-client',
          NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_e2e_disabled',
          NEXT_PUBLIC_POSTHOG_HOST:
            process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
          NEXT_PUBLIC_POSTHOG_UI_HOST:
            process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://us.posthog.com',
        },
      },
})
