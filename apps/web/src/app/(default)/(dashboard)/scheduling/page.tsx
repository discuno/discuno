import { SchedulingContent } from './components/SchedulingContent'
import { SchedulingShell } from './components/SchedulingShell'

export default function SchedulingPage() {
  return (
    <SchedulingShell>
      <SchedulingContent />
    </SchedulingShell>
  )
}

export const metadata = {
  title: 'Scheduling Center | Discuno',
  description: 'Manage your availability, event types, and booking preferences',
}
