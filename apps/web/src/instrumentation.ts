import * as Sentry from '@sentry/nextjs'

export const register = async () => {
  // Only initialize Sentry if we have an auth token or in production
  if (!process.env.SENTRY_AUTH_TOKEN && process.env.NODE_ENV !== 'production') {
    console.log('Skipping Sentry initialization - no auth token provided')
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = process.env.SENTRY_AUTH_TOKEN ? Sentry.captureRequestError : undefined
