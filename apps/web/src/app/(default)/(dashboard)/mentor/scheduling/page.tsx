import { MentorSchedulingContent } from './components/MentorSchedulingContent'
import { MentorSchedulingShell } from './components/MentorSchedulingShell'

export default function MentorSchedulingPage() {
  return (
    <MentorSchedulingShell>
      <MentorSchedulingContent />
    </MentorSchedulingShell>
  )
}

export const metadata = {
  title: 'Scheduling Center | Mentor Dashboard | Discuno',
  description: 'Set your availability and create mentoring session types',
}
