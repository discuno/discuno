import { MentorOnboardingContent } from '../components/MentorOnboardingContent'
import { MentorShell } from '../components/MentorShell'

export default function MentorOnboardingPage() {
  return (
    <MentorShell
      title="Welcome to Mentor Onboarding! 🎉"
      description="Let's get you set up to start earning money by sharing your college experience"
    >
      <MentorOnboardingContent />
    </MentorShell>
  )
}

export const metadata = {
  title: 'Mentor Onboarding | Discuno',
  description:
    'Complete your mentor setup and start earning money by sharing your college experience',
}
