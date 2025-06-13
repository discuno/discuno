import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NEXTAUTH_SECRET: isProd ? z.string() : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    AUTH_EMAIL_FROM: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    JWT_SECRET: z.string(),
    SENDGRID_API_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    CRON_SECRET: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    NEXTAUTH_URL: z.string(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number(),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    EMAIL_FROM: z.string(),
    SENTRY_AUTH_TOKEN: z.string(),
    AUTH_EMAIL_SERVER: z.string(),
    X_CAL_SECRET_KEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_BASE_URL: z.string(),
    NEXT_PUBLIC_X_CAL_ID: z.string(),
    NEXT_PUBLIC_CALCOM_API_URL: z.string(),
  },

  /**
   *  You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    AUTH_EMAIL_SERVER: process.env.AUTH_EMAIL_SERVER,
    NEXT_PUBLIC_X_CAL_ID: process.env.NEXT_PUBLIC_X_CAL_ID,
    X_CAL_SECRET_KEY: process.env.X_CAL_SECRET_KEY,
    NEXT_PUBLIC_CALCOM_API_URL: process.env.NEXT_PUBLIC_CALCOM_API_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
