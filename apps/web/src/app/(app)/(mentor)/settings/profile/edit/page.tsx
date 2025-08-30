import { EditProfileContent } from '../components/EditProfileContent'
import { ProfileShell } from '../components/ProfileShell'

const EditProfilePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) => {
  const params = await searchParams

  return (
    <ProfileShell
      title="Edit Profile"
      description="Update your profile information and academic details"
    >
      <EditProfileContent searchParams={params} />
    </ProfileShell>
  )
}

export default EditProfilePage

export const metadata = {
  title: 'Edit Profile | Discuno',
  description: 'Update your profile information and academic details on Discuno',
}
