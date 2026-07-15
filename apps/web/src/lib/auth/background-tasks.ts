import 'server-only'

import { after } from 'next/server'
import { authErrorKind } from '~/lib/auth/security'

/**
 * Keep Better Auth's deferred work alive after the response without allowing a
 * rejected task to expose provider or user details through an unhandled error.
 */
export const scheduleAuthBackgroundTask = (promise: Promise<unknown>): void => {
  const redactedTask = promise.catch((error: unknown) => {
    console.error('[Auth background task] Failed', { errorKind: authErrorKind(error) })
  })

  after(redactedTask)
}
