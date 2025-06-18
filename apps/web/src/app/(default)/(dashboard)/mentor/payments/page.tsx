import { MentorPaymentsContent } from './components/MentorPaymentsContent'
import { MentorPaymentsShell } from './components/MentorPaymentsShell'

export default function MentorPaymentsPage() {
  return (
    <MentorPaymentsShell>
      <MentorPaymentsContent />
    </MentorPaymentsShell>
  )
}

export const metadata = {
  title: 'Payments & Earnings | Mentor Dashboard | Discuno',
  description: 'Connect Stripe and manage your mentoring earnings',
}
