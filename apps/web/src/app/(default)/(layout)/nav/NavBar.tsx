import { NavBarBase } from '~/app/(default)/(layout)/nav/NavigationClient'
import { getProfileWithImageCached } from '~/server/queries'

export const NavBar = async () => {
  // Get profile data for authenticated users
  const profileData = await getProfileWithImageCached()

  return <NavBarBase profilePic={profileData.profilePic} isMentor={profileData.isMentor} />
}
