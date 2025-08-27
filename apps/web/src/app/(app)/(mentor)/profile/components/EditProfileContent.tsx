import { GraduationCap, User } from 'lucide-react'
import Link from 'next/link'
import { updateUserProfile } from '~/app/(app)/(mentor)/profile/actions'
import { ProfileCard } from '~/app/(app)/(mentor)/profile/components/ProfileCard'
import { ProfileImageUpload } from '~/app/(app)/(mentor)/profile/components/ProfileImageUpload'
import { StatusToast } from '~/components/shared/StatusToast'
import { Button } from '~/components/ui/button'
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
      <form action={updateUserProfile} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-8 lg:col-span-1">
            <ProfileImageUpload currentImageUrl={profile?.image} userName={profile?.name} />
          </div>

          {/* Right Column */}
          <div className="space-y-8 lg:col-span-2">
            <ProfileCard title="Basic Information" icon={User}>
              <div className="space-y-4">
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
              </div>
            </ProfileCard>

            <ProfileCard title="Academic Information" icon={GraduationCap}>
              <div className="space-y-4">
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
              </div>
            </ProfileCard>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/profile/view">Cancel</Link>
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>

      <StatusToast status={searchParams.status ?? null} />
    </>
  )
}
