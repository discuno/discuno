import { redirect } from 'next/navigation'
import { StatusToast } from '~/components/shared/StatusToast'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfileWithImage } from '~/server/queries'

const EditProfilePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) => {
  const { id } = await requireAuth()
  const userProfile = await getProfileWithImage(id)

  // If the user is not a mentor or their .edu email is not verified, redirect them
  if (!userProfile?.isEduVerified) {
    redirect('/email-verification')
  }

  // Function to handle profile updates
  const handleUpdateProfile = async (formData: FormData) => {
    'use server'
    const bio = formData.get('bio') as string
    const schoolYear = formData.get('school_year') as string
    const graduationYear = parseInt(formData.get('graduation_year') as string, 10)
    const profileImageUrl = formData.get('profile_image_url') as string | null

    // Basic validation
    if (!bio || !schoolYear || isNaN(graduationYear)) {
      redirect('/profile/edit?status=invalid-input')
    }

    // Validate schoolYear
    const validSchoolYears = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']
    if (!validSchoolYears.includes(schoolYear)) {
      redirect('/profile/edit?status=invalid-school-year')
    }

    // Validate graduationYear (e.g., should be current year or future)
    const currentYear = new Date().getFullYear()
    if (graduationYear < currentYear || graduationYear > currentYear + 10) {
      redirect('/profile/edit?status=invalid-graduation-year')
    }

    // Check if any change has been made
    const isProfileUnchanged =
      bio === userProfile.bio &&
      schoolYear === userProfile.schoolYear &&
      graduationYear === userProfile.graduationYear &&
      (!profileImageUrl || profileImageUrl === userProfile.user.image)

    if (isProfileUnchanged) {
      redirect('/profile/view')
    }

    try {
      // Update the userProfiles table with the additional information
      /* TODO: Uncomment this when we have a way to update the profile image:w
      await updateProfileWithImage(userId, {
        bio,
        schoolYear,
        graduationYear,
        image: profileImageUrl ?? null,
      });
      */
      // Redirect to the edit profile page upon successful update
      redirect('/profile/view')
    } catch (error: unknown) {
      // If the error is a NEXT_REDIRECT, rethrow it to allow Next.js to handle the redirect
      if (
        typeof error === 'object' &&
        error &&
        'digest' in error &&
        typeof error.digest === 'string' &&
        error.digest.startsWith('NEXT_REDIRECT')
      ) {
        throw error
      }
      console.error('Error during profile update:', error)
      // Redirect to the edit profile page with an error status
      redirect('/profile/edit?status=error')
    }
  }

  const params = await searchParams
  const status = params.status ?? ''

  return (
    <>
      <form action={handleUpdateProfile} className="grid gap-3">
        <div className="flex items-center gap-4">
          {/* TODO: Uncomment this when we have a way to update the profile image:w
          <ImageUploader currentImage={userProfile.user?.image ?? null} />
          */}
          <div className="flex-1 text-center">
            <h1 className="text-primary text-2xl font-bold">Edit Your Profile</h1>
            <p className="text-md text-muted-foreground">Update your profile information</p>
          </div>
          <div className="w-[72px]" />
        </div>

        <Card className="shadow-xs">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Biography</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <Input
              id="bio"
              name="bio"
              type="text"
              placeholder="Tell us about yourself..."
              required
              defaultValue={userProfile.bio ?? ''}
            />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Academic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pb-4">
            <div>
              <Label htmlFor="school_year" className="text-xs">
                School Year
              </Label>
              <Select name="school_year" required defaultValue={userProfile.schoolYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your current school year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freshman">Freshman</SelectItem>
                  <SelectItem value="Sophomore">Sophomore</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="graduation_year" className="text-xs">
                Graduation Year
              </Label>
              <Input
                id="graduation_year"
                name="graduation_year"
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 10}
                placeholder="e.g., 2027"
                required
                defaultValue={userProfile.graduationYear || ''}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full">
          Save Changes
        </Button>
      </form>

      <StatusToast status={status} />
    </>
  )
}

export default EditProfilePage
