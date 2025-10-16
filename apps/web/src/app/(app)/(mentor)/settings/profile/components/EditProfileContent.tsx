'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateUserProfile } from '~/app/(app)/(mentor)/settings/profile/actions'
import { ProfileCard } from '~/app/(app)/(mentor)/settings/profile/components/ProfileCard'
import { ProfileImageUpload } from '~/app/(app)/(mentor)/settings/profile/components/ProfileImageUpload'
import type { FullUserProfile } from '~/app/types'
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

type School = {
  label: string
  value: string
  id: number
}

type Major = {
  label: string
  value: string
  id: number
}

interface EditProfileContentProps {
  profile: FullUserProfile
  schools: School[]
  majors: Major[]
}

export const EditProfileContent = ({ profile, schools, majors }: EditProfileContentProps) => {
  const currentYear = new Date().getFullYear()
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i)
  const router = useRouter()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (formData: FormData) => updateUserProfile(formData),
    onSuccess: data => {
      if (data.success) {
        toast.success('Profile updated successfully!')
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        router.refresh()
      } else {
        toast.error(data.message ?? 'An unexpected error occurred.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An unexpected error occurred.')
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-8 lg:col-span-1">
          <ProfileImageUpload currentImageUrl={profile.image} userName={profile.name} />
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
                  defaultValue={profile.name ?? ''}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile.bio ?? ''}
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
                <Select name="school" disabled defaultValue={profile.school ?? ''}>
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
                <Select name="major" defaultValue={profile.major ?? ''}>
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
                  <Select name="schoolYear" defaultValue={profile.schoolYear}>
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
                  <Label htmlFor="graduationYear">Expected Graduation Year</Label>
                  <Select name="graduationYear" defaultValue={profile.graduationYear.toString()}>
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
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
