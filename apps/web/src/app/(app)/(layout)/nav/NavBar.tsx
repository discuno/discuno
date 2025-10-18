import { getMentorOnboardingStatus } from '~/app/(app)/(mentor)/settings/actions'
import { NavBarBase } from '~/app/(app)/(layout)/nav/NavigationClient'
import { getProfileWithImageCached } from '~/server/queries/profiles'

export const NavBar = async () => {
  // Get profile data for authenticated users, or null if not authenticated
  const profileData = await getProfileWithImageCached()

  // Get onboarding status for authenticated mentors
  const onboardingStatus = profileData ? await getMentorOnboardingStatus() : null

  return (
    <NavBarBase
      profilePic={profileData?.profilePic ?? null}
      isAuthenticated={profileData != null}
      onboardingStatus={onboardingStatus}
    />
  )
}
