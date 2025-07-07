import { updateUserProfile } from '~/app/(default)/profile/actions'
import { ProfileImageUpload } from '~/app/(default)/profile/components/ProfileImageUpload'
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
import { Textarea } from '~/components/ui/textarea'
import { getFullProfile, getMajors, getSchools } from '~/server/queries'

interface EditProfileContentProps {
  searchParams: { status?: string }
}

const getEditProfileData = async () => {
  const [profile, schools, majors] = await Promise.all([
    getFullProfile(),
    getSchools(),
    getMajors(),
  ])
  return { profile, schools, majors }
}

export const EditProfileContent = async ({ searchParams }: EditProfileContentProps) => {
  const { profile, schools, majors } = await getEditProfileData()

  const currentYear = new Date().getFullYear()
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i)

  return (
    <>
      <ProfileImageUpload currentImageUrl={profile?.image} userName={profile?.name} />

      <form action={updateUserProfile} className="mt-4 space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile?.name ?? ''}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="bio">Biography</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile?.bio ?? ''}
                placeholder="Tell students about yourself, your experience, and what you can help with..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="school">School</Label>
              <Select name="school" disabled defaultValue={profile?.school ?? ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.label}>
                      {school.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="major">Major</Label>
              <Select name="major" defaultValue={profile?.major ?? ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your major" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map(major => (
                    <SelectItem key={major.id} value={major.label}>
                      {major.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolYear">Academic Level</Label>
                <Select name="schoolYear" defaultValue={profile?.schoolYear ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
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
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Select
                  name="graduationYear"
                  defaultValue={profile?.graduationYear.toString() ?? ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {graduationYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            Save Changes
          </Button>
          <Button type="button" variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </form>

      <StatusToast status={searchParams.status ?? null} />
    </>
  )
}
