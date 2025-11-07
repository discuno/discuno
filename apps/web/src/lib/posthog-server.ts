import { PostHog } from 'posthog-node'
import { env } from '~/env'

let posthogClient: PostHog | null = null

/**
 * Get or create the server-side PostHog client
 */
export const getPostHogClient = (): PostHog => {
  posthogClient ??= new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1, // Flush after each event in serverless environments
    flushInterval: 0, // Don't use interval-based flushing in serverless
  })
  return posthogClient
}

/**
 * Track a server-side event in PostHog
 * @param distinctId - User ID or session ID
 * @param event - Event name
 * @param properties - Event properties
 */
export const trackServerEvent = async (
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) => {
  try {
    const client = getPostHogClient()
    client.capture({
      distinctId,
      event,
      properties,
    })
    // Ensure the event is sent before the function terminates
    await client.shutdown()
    console.log(`✅ PostHog event tracked: ${event}`, { distinctId, properties })
  } catch (error) {
    console.error(`❌ Failed to track PostHog event: ${event}`, error)
  }
}

/**
 * Identify a user in PostHog
 * @param distinctId - User ID
 * @param properties - User properties
 */
export const identifyUser = async (distinctId: string, properties?: Record<string, unknown>) => {
  try {
    const client = getPostHogClient()
    client.identify({
      distinctId,
      properties,
    })
    await client.shutdown()
    console.log(`✅ PostHog user identified: ${distinctId}`, properties)
  } catch (error) {
    console.error(`❌ Failed to identify PostHog user: ${distinctId}`, error)
  }
}
