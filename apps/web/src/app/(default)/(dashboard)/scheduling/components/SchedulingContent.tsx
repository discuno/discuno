import { getSchedule } from '~/app/(default)/(dashboard)/scheduling/actions'
import { AvailabilityManager } from './availability/AvailabilityManager'

export async function SchedulingContent() {
  const initialAvailability = await getSchedule()
  return <AvailabilityManager initialAvailability={initialAvailability} />
}
