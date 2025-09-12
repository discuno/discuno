import { getFullProfile, getMajors, getSchools } from '~/server/queries'
import { EditProfileContent } from '../components/EditProfileContent'
import { ProfileShell } from '../components/ProfileShell'

const getEditProfileData = async () => {
  const [profile, schools, majors] = await Promise.all([
    getFullProfile(),
    getSchools(),
    getMajors(),
  ])
  return { profile, schools, majors }
}

const EditProfilePage = async () => {
  const { profile, schools, majors } = await getEditProfileData()

  if (!profile) {
    return <div>User not found</div>
  }

  return (
    <ProfileShell
      title="Edit Profile"
      description="Update your profile information and academic details"
    >
      <EditProfileContent profile={profile} schools={schools} majors={majors} />
    </ProfileShell>
  )
}

export default EditProfilePage

export const metadata = {
  title: 'Edit Profile | Discuno',
  description: 'Update your profile information and academic details on Discuno',
}
