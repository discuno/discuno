import { EventTypeList } from './components/EventTypeList'
import { SchedulingShell } from './components/SchedulingShell'

export default function SchedulingPage() {
  return (
    <SchedulingShell>
      <EventTypeList />
    </SchedulingShell>
  )
}

export const metadata = {
  title: 'Scheduling Center | Discuno',
  description: 'Manage your availability, event types, and booking preferences',
}
