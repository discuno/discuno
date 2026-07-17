import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFullProfile } from '~/server/queries/profiles'
import { getMajors } from '~/server/queries/reference-data'
import { EditProfileContent } from '../components/EditProfileContent'
import { ProfileShell } from '../components/ProfileShell'

const getEditProfileData = async () => {
  const [profile, majors] = await Promise.all([getFullProfile(), getMajors()])
  return { profile, majors }
}

const EditProfilePage = async () => {
  const { profile, majors } = await getEditProfileData()

  if (!profile) notFound()

  return (
    <ProfileShell
      title="Help students know when you’re the right person to ask."
      description="Share the school, field, and decisions behind your perspective. Be specific about what you’ve lived through and what you can responsibly help someone think through."
    >
      <EditProfileContent profile={profile} majors={majors} />
    </ProfileShell>
  )
}

export default EditProfilePage

export const metadata: Metadata = {
  title: 'Edit mentor profile | Discuno',
  description: 'Update the experience and academic context shown on your public mentor profile.',
}
