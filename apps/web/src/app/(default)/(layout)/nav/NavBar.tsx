import { NavBarBase } from '~/app/(default)/(layout)/nav/NavigationClient'
import { getProfileWithImageCached } from '~/server/queries'

export const NavBar = async () => {
  // Get profile data for authenticated users, or null if not authenticated
  const profileData = await getProfileWithImageCached()

  return (
    <NavBarBase
      profilePic={profileData?.profilePic ?? null}
      isAuthenticated={profileData != null}
    />
  )
}
