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
      title="Public profile"
      description="Show students where your experience can help."
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
