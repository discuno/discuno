import { fetchCalcomEventTypesByUsername } from '~/lib/calcom'
import { ExternalApiError } from '~/lib/errors'

/**
 * Fetch the mentor's individual Cal.com event type ID by slug
 * This fetches the mentor's personal event type instance, not the parent team event type
 */
export const getMentorCalcomEventTypeId = async (
  mentorUsername: string,
  eventTypeSlug: string
): Promise<number> => {
  const eventTypes = await fetchCalcomEventTypesByUsername(mentorUsername)

  // Find the event type by slug
  const eventType = eventTypes.find(et => et.slug === eventTypeSlug)

  if (!eventType) {
    throw new ExternalApiError(
      `Event type with slug "${eventTypeSlug}" not found for mentor ${mentorUsername}`
    )
  }

  return eventType.id
}
