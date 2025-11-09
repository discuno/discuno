import { NavBarBase } from '~/app/(app)/(layout)/nav/NavigationClient'
import { getMentorOnboardingStatus } from '~/app/(app)/(mentor)/settings/actions'
import { hasPermission } from '~/lib/auth/auth-utils'
import { getProfileWithImageCached } from '~/server/queries/profiles'

export const NavBar = async () => {
  // Get profile data for authenticated users, or null if not authenticated
  const profileData = await getProfileWithImageCached()

  // Check if user has mentor permissions (consolidated mentor dashboard access)
  // Uses the new simplified permission system
  const isMentor = await hasPermission({ mentor: ['manage'] })

  // Get onboarding status only for mentors
  const onboardingStatus = profileData && isMentor ? await getMentorOnboardingStatus() : null

  return (
    <NavBarBase
      profilePic={profileData?.profilePic ?? null}
      isAuthenticated={profileData != null}
      isMentor={isMentor}
      onboardingStatus={onboardingStatus}
    />
  )
}
