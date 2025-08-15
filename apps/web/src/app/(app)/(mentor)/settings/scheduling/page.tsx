import { getSchedule } from './actions'
import { SchedulingContent } from './components/SchedulingContent'
import { SchedulingShell } from './components/SchedulingShell'
export const dynamic = 'force-dynamic'

export default async function SchedulingPage() {
  const scheduleResult = await getSchedule()

  return (
    <SchedulingShell>
      <SchedulingContent initialScheduleResult={scheduleResult} />
    </SchedulingShell>
  )
}

export const metadata = {
  title: 'Scheduling Center | Discuno',
  description: 'Manage your availability, event types, and booking preferences',
}
