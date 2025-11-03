'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, GraduationCap, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateUserProfile } from '~/app/(app)/(mentor)/settings/profile/actions'
import { ProfileCard } from '~/app/(app)/(mentor)/settings/profile/components/ProfileCard'
import { ProfileImageUpload } from '~/app/(app)/(mentor)/settings/profile/components/ProfileImageUpload'
import type { FullUserProfile } from '~/app/types'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

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

  const [majorOpen, setMajorOpen] = useState(false)
  const [majorValue, setMajorValue] = useState(profile.major ?? '')

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
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  defaultValue={profile.name ?? ''}
                  placeholder="Enter your full name"
                  required
                  className="text-base"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bio">
                  Biography <span className="text-red-500">*</span>
                </FieldLabel>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={
                    profile.bio ?? (profile.school ? `Student at ${profile.school}` : '')
                  }
                  placeholder="Tell students about yourself, your experience, and what you can help with..."
                  rows={5}
                  required
                  className="resize-none text-base"
                />
                <FieldDescription>
                  Share your background, interests, and how you can help prospective students
                </FieldDescription>
              </Field>
            </FieldGroup>
          </ProfileCard>

          <ProfileCard
            title="Academic Information"
            description="Your academic background helps students find the right mentor"
            icon={GraduationCap}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="school">School</FieldLabel>
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
              </Field>

              <Field>
                <FieldLabel htmlFor="major">
                  Major <span className="text-red-500">*</span>
                </FieldLabel>
                <input type="hidden" name="major" value={majorValue} required />
                <Popover open={majorOpen} onOpenChange={setMajorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={majorOpen}
                      className="w-full justify-between text-base"
                    >
                      {majorValue
                        ? majors.find(major => major.label === majorValue)?.label
                        : 'Select your major'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search major..." className="text-base" />
                      <CommandList>
                        <CommandEmpty>No major found.</CommandEmpty>
                        <CommandGroup>
                          {majors.map(major => (
                            <CommandItem
                              key={major.id}
                              value={major.label}
                              onSelect={currentValue => {
                                setMajorValue(currentValue === majorValue ? '' : currentValue)
                                setMajorOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  majorValue === major.label ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {major.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="schoolYear">Academic Level</FieldLabel>
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
                </Field>

                <Field>
                  <FieldLabel htmlFor="graduationYear">Expected Graduation</FieldLabel>
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
                </Field>
              </div>
            </FieldGroup>
          </ProfileCard>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
