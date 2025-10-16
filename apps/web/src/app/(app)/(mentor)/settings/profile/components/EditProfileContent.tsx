'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, User } from 'lucide-react'
import Link from 'next/link'
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Image */}
        <div className="lg:col-span-1">
          <ProfileImageUpload currentImageUrl={profile.image} userName={profile.name} />
        </div>

        {/* Right Column - Form Fields */}
        <div className="space-y-6 lg:col-span-2">
          <ProfileCard
            title="Basic Information"
            description="Your name and bio are displayed on your public profile"
            icon={User}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={profile.name ?? ''}
                  placeholder="Enter your full name"
                  required
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">
                  Biography
                </Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile.bio ?? ''}
                  placeholder="Tell students about yourself, your experience, and what you can help with..."
                  rows={5}
                  className="resize-none text-base"
                />
                <p className="text-muted-foreground text-xs">
                  Share your background, interests, and how you can help prospective students
                </p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard
            title="Academic Information"
            description="Your academic background helps students find the right mentor"
            icon={GraduationCap}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="school" className="text-sm font-medium">
                  School
                </Label>
                <Select name="school" disabled defaultValue={profile.school ?? ''}>
                  <SelectTrigger className="text-base">
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
                <p className="text-muted-foreground text-xs">
                  School cannot be changed after registration
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="major" className="text-sm font-medium">
                  Major
                </Label>
                <Select name="major" defaultValue={profile.major ?? ''}>
                  <SelectTrigger className="text-base">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolYear" className="text-sm font-medium">
                    Academic Level
                  </Label>
                  <Select name="schoolYear" defaultValue={profile.schoolYear}>
                    <SelectTrigger className="text-base">
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

                <div className="space-y-2">
                  <Label htmlFor="graduationYear" className="text-sm font-medium">
                    Expected Graduation
                  </Label>
                  <Select name="graduationYear" defaultValue={profile.graduationYear.toString()}>
                    <SelectTrigger className="text-base">
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
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/profile/view">Cancel</Link>
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
