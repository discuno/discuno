import { env } from '~/env'
import { ExternalApiError } from '~/lib/errors'

/**
 * Fetch the mentor's individual Cal.com event type ID by slug
 * This fetches the mentor's personal event type instance, not the parent team event type
 */
export const getMentorCalcomEventTypeId = async (
  mentorUsername: string,
  eventTypeSlug: string
): Promise<number> => {
  const response = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types?username=${encodeURIComponent(mentorUsername)}`,
    {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-06-14',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new ExternalApiError(
      `Failed to fetch mentor event types: ${response.status} ${errorText}`
    )
  }

  const data = await response.json()

  if (data.status !== 'success' || !Array.isArray(data.data)) {
    throw new ExternalApiError('Invalid Cal.com event types response')
  }

  // Find the event type by slug
  const eventType = data.data.find((et: any) => et.slug === eventTypeSlug)

  if (!eventType) {
    throw new ExternalApiError(
      `Event type with slug "${eventTypeSlug}" not found for mentor ${mentorUsername}`
    )
  }

  return eventType.id
}
