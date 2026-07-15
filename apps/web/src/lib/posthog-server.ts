import 'server-only'

import { PostHog } from 'posthog-node'
import { env } from '~/env'
import { getUserAnalyticsPreference } from '~/server/dal/analytics-preferences'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'

const DATABASE_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Non-user system distinct IDs retain the historical capture behavior. User
 * IDs require an explicit durable opt-in, and lookup failures fail closed so
 * an unset or opted-out user's event is never sent.
 */
const resolveCaptureIdentity = async (
  distinctId: string
): Promise<{ distinctId: string; canCapture: boolean }> => {
  if (!DATABASE_USER_ID_PATTERN.test(distinctId)) return { distinctId, canCapture: true }

  try {
    const canonicalUserId = await resolveCanonicalUserId(distinctId)
    if (!canonicalUserId) return { distinctId, canCapture: false }
    return {
      distinctId: canonicalUserId,
      canCapture: (await getUserAnalyticsPreference(canonicalUserId)) === true,
    }
  } catch (error) {
    console.error('PostHog consent lookup failed; analytics operation suppressed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return { distinctId, canCapture: false }
  }
}

/**
 * Creates a new PostHog client instance, configured for serverless environments.
 * Each call creates a fresh client to avoid issues with shutdown in serverless contexts.
 */
const createPostHogClient = () => {
  return new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1, // Flush after each event in serverless environments
    flushInterval: 0, // Don't use interval-based flushing in serverless
  })
}

/**
 * Track a server-side event in PostHog.
 * A new client is created for each call to ensure proper flushing in a serverless environment.
 * @param distinctId - User ID or session ID
 * @param event - Event name
 * @param properties - Event properties
 */
export const trackServerEvent = async (
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) => {
  const captureIdentity = await resolveCaptureIdentity(distinctId)
  if (!captureIdentity.canCapture) return

  const client = createPostHogClient()
  try {
    client.capture({
      distinctId: captureIdentity.distinctId,
      event,
      properties,
    })
    // Ensure the event is sent before the function terminates
    await client.shutdown()
  } catch (error) {
    console.error('PostHog event tracking failed', {
      event,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    // Attempt to shut down even if capture fails
    await client.shutdown().catch(shutdownError => {
      console.error('PostHog client shutdown failed after capture', {
        errorName: shutdownError instanceof Error ? shutdownError.name : 'UnknownError',
      })
    })
  }
}

/**
 * Identify a user in PostHog.
 * A new client is created for each call to ensure proper flushing in a serverless environment.
 * @param distinctId - User ID
 * @param properties - User properties
 */
export const identifyUser = async (distinctId: string, properties?: Record<string, unknown>) => {
  const captureIdentity = await resolveCaptureIdentity(distinctId)
  if (!captureIdentity.canCapture) return

  const client = createPostHogClient()
  try {
    client.identify({
      distinctId: captureIdentity.distinctId,
      properties,
    })
    await client.shutdown()
  } catch (error) {
    console.error('PostHog user identification failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    // Attempt to shut down even if identify fails
    await client.shutdown().catch(shutdownError => {
      console.error('PostHog client shutdown failed after identify', {
        errorName: shutdownError instanceof Error ? shutdownError.name : 'UnknownError',
      })
    })
  }
}
