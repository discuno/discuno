import { getSchedule } from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { AvailabilityManager } from './availability/AvailabilityManager'

export async function SchedulingContent() {
  const initialAvailability = await getSchedule()
  return <AvailabilityManager initialAvailability={initialAvailability} />
}
