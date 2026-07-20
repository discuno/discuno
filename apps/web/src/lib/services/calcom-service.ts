import type { UpdateMentorEventType } from '~/lib/schemas/db'
import { updateMentorEventType as updateMentorEventTypeQuery } from '~/server/queries/event-types'

/** Update a mentor-owned local session type preference through the protected query boundary. */
export const updateMentorEventType = async (
  eventTypeId: number,
  data: UpdateMentorEventType
): Promise<void> => {
  return updateMentorEventTypeQuery(eventTypeId, data)
}
