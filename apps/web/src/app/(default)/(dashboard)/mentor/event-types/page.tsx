import { MentorEventTypesContent } from './components/MentorEventTypesContent'
import { MentorEventTypesShell } from './components/MentorEventTypesShell'

export default function MentorEventTypesPage() {
  return (
    <MentorEventTypesShell>
      <MentorEventTypesContent />
    </MentorEventTypesShell>
  )
}

export const metadata = {
  title: 'Event Types | Mentor Dashboard | Discuno',
  description: 'Create and manage different types of mentoring sessions',
}
