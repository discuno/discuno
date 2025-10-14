import { connection } from 'next/server'
import { OnboardingDashboard } from '~/app/(app)/(mentor)/settings/components/OnboardingDashboard'
import { getMentorOnboardingStatus } from '~/app/(app)/(mentor)/settings/actions'

export default async function MentorSettingsPage() {
  await connection()
  const onboardingStatus = await getMentorOnboardingStatus()

  return <OnboardingDashboard initialStatus={onboardingStatus} />
}
