import { PostHog } from 'posthog-node'
import { env } from '~/env'

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
  const client = createPostHogClient()
  try {
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
    // Attempt to shut down even if capture fails
    await client.shutdown().catch(shutdownError => {
      console.error(`Error shutting down PostHog client after a capture error:`, shutdownError)
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
  const client = createPostHogClient()
  try {
    client.identify({
      distinctId,
      properties,
    })
    await client.shutdown()
    console.log(`✅ PostHog user identified: ${distinctId}`, properties)
  } catch (error) {
    console.error(`❌ Failed to identify PostHog user: ${distinctId}`, error)
    // Attempt to shut down even if identify fails
    await client.shutdown().catch(shutdownError => {
      console.error(`Error shutting down PostHog client after an identify error:`, shutdownError)
    })
  }
}
