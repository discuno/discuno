/**
 * Simple logging utility that can be easily replaced with a more sophisticated
 * logging solution (e.g., winston, pino) in the future.
 *
 * In production, logs can be sent to monitoring services like Sentry or Datadog.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

const shouldLog = (level: LogLevel): boolean => {
  if (isTest) return false
  if (isDevelopment) return true
  // In production, only log warnings and errors
  return level === 'warn' || level === 'error'
}

const formatMessage = (level: LogLevel, message: string, context?: LogContext): string => {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context))
    }
  },

  info: (message: string, context?: LogContext) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context))
    }
  },

  warn: (message: string, error?: unknown, context?: LogContext) => {
    if (shouldLog('warn')) {
      const warnContext =
        error instanceof Error
          ? { ...context, error: error.message, stack: error.stack }
          : error !== undefined
            ? { ...context, error }
            : context
      console.warn(formatMessage('warn', message, warnContext))
    }
  },

  error: (message: string, error?: unknown, context?: LogContext) => {
    if (shouldLog('error')) {
      const errorContext =
        error instanceof Error
          ? { ...context, error: error.message, stack: error.stack }
          : { ...context, error }
      console.error(formatMessage('error', message, errorContext))

      // TODO: Send to error tracking service (Sentry) in production
      // if (process.env.NODE_ENV === 'production' && typeof Sentry !== 'undefined') {
      //   Sentry.captureException(error, { extra: context })
      // }
    }
  },
}
