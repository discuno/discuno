import { TimeZoneDetector } from '~/app/(app)/(mentor)/settings/profile/view/TimeZoneDetector'
import { ProfileShell } from '../components/ProfileShell'
import { ViewProfileContent } from '../components/ViewProfileContent'

const ViewProfilePage = async () => {
  return (
    <ProfileShell title="My Profile" description="View and manage your profile information">
      <ViewProfileContent />
      <TimeZoneDetector />
    </ProfileShell>
  )
}

export default ViewProfilePage

export const metadata = {
  title: 'My Profile | Discuno',
  description: 'View and manage your profile information on Discuno',
}
