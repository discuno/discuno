import { NavBarBase } from '~/app/(default)/(layout)/nav/NavigationClient'
import { UnauthenticatedError } from '~/lib/auth/auth-utils'
import { getProfileWithImageCached } from '~/server/queries'

export const NavBar = async () => {
  try {
    const { profilePic, isMentor } = await getProfileWithImageCached()
    return <NavBarBase profilePic={profilePic} isMentor={isMentor} />
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return null
    }
    return null
  }
}
