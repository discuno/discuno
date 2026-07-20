import { NavBarBase } from '~/app/(app)/(layout)/nav/NavigationClient'
import { hasPermission } from '~/lib/auth/auth-utils'
import { getProfileWithImageCached } from '~/server/queries/profiles'

export const NavBar = async () => {
  const [profileData, isMentor] = await Promise.all([
    getProfileWithImageCached(),
    hasPermission({ mentor: ['manage'] }),
  ])

  return (
    <NavBarBase
      profilePic={profileData?.profilePic ?? null}
      isAuthenticated={profileData != null}
      isMentor={isMentor}
    />
  )
}
