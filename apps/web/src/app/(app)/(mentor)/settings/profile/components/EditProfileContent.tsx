'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleAlert,
  GraduationCap,
  Save,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateUserProfile } from '~/app/(app)/(mentor)/settings/profile/actions'
import { ProfileCard } from '~/app/(app)/(mentor)/settings/profile/components/ProfileCard'
import { ProfileImageUpload } from '~/app/(app)/(mentor)/settings/profile/components/ProfileImageUpload'
import { ProfilePreviewCard } from '~/app/(app)/(mentor)/settings/profile/components/ProfilePreviewCard'
import {
  ACADEMIC_LEVELS,
  BIO_MAX_LENGTH,
  createProfileDraft,
  getProfileReadiness,
  hasProfileDraftChanged,
  normalizeProfileUsername,
  validateProfileDraft,
  type ProfileDraft,
  type ProfileField,
  type ProfileFieldErrors,
} from '~/app/(app)/(mentor)/settings/profile/components/profile-form-state'
import type { FullUserProfile } from '~/app/types'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

type Major = {
  label: string
  value: string
  id: number
}

interface EditProfileContentProps {
  profile: FullUserProfile
  majors: Major[]
}

interface ProfileSaveRequest {
  formData: FormData
  draftSnapshot: ProfileDraft
}

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved profile changes. Leave without saving them?'

const RequiredText = () => (
  <>
    <span aria-hidden="true">*</span>
    <span className="sr-only"> (required)</span>
  </>
)

export const EditProfileContent = ({ profile, majors }: EditProfileContentProps) => {
  const currentYear = new Date().getFullYear()
  const graduationYears = useMemo(
    () => Array.from({ length: 9 }, (_, index) => currentYear + index),
    [currentYear]
  )
  const academicLevelItems = useMemo(
    () => [
      { label: 'Select level', value: null },
      ...ACADEMIC_LEVELS.map(level => ({ label: level, value: level })),
    ],
    []
  )
  const graduationYearItems = useMemo(
    () => [
      { label: 'Select year', value: null },
      ...graduationYears.map(year => ({ label: year.toString(), value: year.toString() })),
    ],
    [graduationYears]
  )
  const initialDraft = useMemo(
    () => createProfileDraft(profile, currentYear),
    [currentYear, profile]
  )
  const router = useRouter()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<ProfileDraft>(initialDraft)
  const draftRef = useRef(draft)
  const [savedDraft, setSavedDraft] = useState<ProfileDraft>(initialDraft)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(profile.image)
  const [savedUsername, setSavedUsername] = useState<string | null>(profile.username)
  const [majorOpen, setMajorOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const isDirty = hasProfileDraftChanged(draft, savedDraft)
  const readiness = getProfileReadiness(draft, Boolean(profileImageUrl))

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const handleLinkClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const targetUrl = new URL(anchor.href, window.location.href)
      const currentUrl = new URL(window.location.href)
      const staysOnCurrentDocument =
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search

      if (staysOnCurrentDocument || window.confirm(UNSAVED_CHANGES_MESSAGE)) return

      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleLinkClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [isDirty])

  function updateField<FieldName extends ProfileField>(
    field: FieldName,
    value: ProfileDraft[FieldName]
  ) {
    setDraft(current => {
      const next = { ...current, [field]: value }
      draftRef.current = next
      return next
    })
    setFieldErrors(current => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setFormError(null)
    setSaveMessage(null)
  }

  const mutation = useMutation({
    mutationFn: ({ formData }: ProfileSaveRequest) => updateUserProfile(formData),
    onSuccess: (data, request) => {
      if (!data.success) {
        const message = data.message ?? 'We could not save your profile. Please try again.'
        if (message.toLowerCase().includes('username')) {
          setFieldErrors(current => ({ ...current, username: message }))
        }
        setFormError(message)
        setSaveMessage(null)
        toast.error('Profile not saved.')
        return
      }

      const savedValues: ProfileDraft = {
        ...request.draftSnapshot,
        name: request.draftSnapshot.name.trim(),
        username: request.draftSnapshot.username.trim(),
        bio: request.draftSnapshot.bio.trim(),
        major: request.draftSnapshot.major.trim(),
      }
      const hasNewerChanges = hasProfileDraftChanged(draftRef.current, request.draftSnapshot)

      if (!hasNewerChanges) {
        draftRef.current = savedValues
        setDraft(savedValues)
      }
      setSavedDraft(savedValues)
      setSavedUsername(savedValues.username)
      setFieldErrors({})
      setFormError(null)
      setSaveMessage(
        hasNewerChanges
          ? 'Your earlier changes were saved. Save again when your latest edits are ready.'
          : 'Saved. Your public profile now uses these details.'
      )
      toast.success(hasNewerChanges ? 'Earlier profile changes saved.' : 'Profile saved.')
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.refresh()
    },
    onError: () => {
      const message = 'We could not save your profile. Please try again.'
      setFormError(message)
      setSaveMessage(null)
      toast.error(message)
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveMessage(null)

    const errors = validateProfileDraft(draft, currentYear)
    setFieldErrors(errors)

    const firstInvalidField = (
      ['name', 'username', 'bio', 'major', 'schoolYear', 'graduationYear'] as ProfileField[]
    ).find(field => errors[field])

    if (firstInvalidField) {
      setFormError('Review the highlighted details before saving.')
      requestAnimationFrame(() => document.getElementById(firstInvalidField)?.focus())
      return
    }

    setFormError(null)
    mutation.mutate({
      formData: new FormData(event.currentTarget),
      draftSnapshot: { ...draft },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError && (
        <Alert variant="destructive" id="profile-form-error">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Profile not saved</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <ProfileImageUpload
            currentImageUrl={profile.image}
            userName={draft.name}
            userId={profile.userId}
            onImageChange={setProfileImageUrl}
          />
          <ProfilePreviewCard
            draft={draft}
            imageUrl={profileImageUrl}
            school={profile.school}
            savedUsername={savedUsername}
            requirements={readiness.requirements}
            readinessPercent={readiness.percent}
            isReady={readiness.isComplete}
            isDirty={isDirty}
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <ProfileCard
            title="Your public introduction"
            description="Give a student enough context to know whether your experience fits the decision they are facing."
            icon={User}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(fieldErrors.name)}>
                <FieldLabel htmlFor="name">
                  Name students will see <RequiredText />
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={draft.name}
                  onChange={event => updateField('name', event.target.value)}
                  placeholder="Your full name"
                  maxLength={255}
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                <FieldError id="name-error">{fieldErrors.name}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.username)}>
                <FieldLabel htmlFor="username">
                  Public username <RequiredText />
                </FieldLabel>
                <Input
                  id="username"
                  name="username"
                  value={draft.username}
                  onChange={event =>
                    updateField('username', normalizeProfileUsername(event.target.value))
                  }
                  placeholder="your-name"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9_-]+"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={
                    fieldErrors.username ? 'username-help username-error' : 'username-help'
                  }
                />
                <FieldDescription id="username-help">
                  This becomes discuno.com/mentor/{draft.username || 'your-name'}. Use lowercase
                  letters, numbers, hyphens, or underscores.
                </FieldDescription>
                <FieldError id="username-error">{fieldErrors.username}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.bio)}>
                <FieldLabel htmlFor="bio">
                  What perspective can you share? <RequiredText />
                </FieldLabel>
                <Textarea
                  id="bio"
                  name="bio"
                  value={draft.bio}
                  onChange={event => updateField('bio', event.target.value)}
                  placeholder="Share a decision you have faced, the tradeoffs you learned from, and the questions you can responsibly help another student think through."
                  rows={8}
                  maxLength={BIO_MAX_LENGTH}
                  required
                  aria-invalid={Boolean(fieldErrors.bio)}
                  aria-describedby={
                    fieldErrors.bio ? 'bio-help bio-count bio-error' : 'bio-help bio-count'
                  }
                  className="min-h-44 resize-y"
                />
                <div className="flex items-start justify-between gap-4">
                  <FieldDescription id="bio-help">
                    Be specific about classes, majors, internships, campus life, or choices you have
                    actually navigated.
                  </FieldDescription>
                  <span
                    id="bio-count"
                    className="text-muted-foreground shrink-0 text-xs tabular-nums"
                    aria-live="polite"
                  >
                    {draft.bio.length}/{BIO_MAX_LENGTH}
                  </span>
                </div>
                <FieldError id="bio-error">{fieldErrors.bio}</FieldError>
              </Field>
            </FieldGroup>
          </ProfileCard>

          <ProfileCard
            title="Where your perspective comes from"
            description="These details help a student understand the context behind your experience."
            icon={GraduationCap}
          >
            <FieldGroup>
              <Field data-disabled>
                <FieldLabel htmlFor="school">School</FieldLabel>
                <Input id="school" value={profile.school ?? 'No school linked'} disabled readOnly />
                <FieldDescription>
                  Linked to your supported school email. Contact support if this is incorrect.
                </FieldDescription>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.major)}>
                <FieldLabel htmlFor="major">
                  Major or field of study <RequiredText />
                </FieldLabel>
                <input type="hidden" name="major" value={draft.major} />
                <Popover open={majorOpen} onOpenChange={setMajorOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id="major"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={majorOpen}
                        aria-invalid={Boolean(fieldErrors.major)}
                        aria-describedby={
                          fieldErrors.major ? 'major-help major-error' : 'major-help'
                        }
                        className="w-full justify-between"
                      />
                    }
                  >
                    <span className={cn('truncate', !draft.major && 'text-muted-foreground')}>
                      {draft.major || 'Choose your major'}
                    </span>
                    <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search majors…" aria-label="Search majors" />
                      <CommandList>
                        <CommandEmpty>No matching major found.</CommandEmpty>
                        <CommandGroup>
                          {majors.map(major => (
                            <CommandItem
                              key={major.id}
                              value={major.label}
                              onSelect={() => {
                                updateField('major', major.label)
                                setMajorOpen(false)
                              }}
                            >
                              <Check
                                aria-hidden="true"
                                className={cn(
                                  draft.major === major.label ? 'opacity-100' : 'opacity-0'
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
                <FieldDescription id="major-help">
                  Choose the field that best matches the experience you want students to find.
                </FieldDescription>
                <FieldError id="major-error">{fieldErrors.major}</FieldError>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.schoolYear)}>
                  <FieldLabel htmlFor="schoolYear">
                    Academic level <RequiredText />
                  </FieldLabel>
                  <Select
                    items={academicLevelItems}
                    name="schoolYear"
                    value={draft.schoolYear}
                    onValueChange={value => {
                      if (value) updateField('schoolYear', value)
                    }}
                  >
                    <SelectTrigger
                      id="schoolYear"
                      aria-invalid={Boolean(fieldErrors.schoolYear)}
                      aria-describedby={fieldErrors.schoolYear ? 'school-year-error' : undefined}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ACADEMIC_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError id="school-year-error">{fieldErrors.schoolYear}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors.graduationYear)}>
                  <FieldLabel htmlFor="graduationYear">
                    Expected graduation <RequiredText />
                  </FieldLabel>
                  <Select
                    items={graduationYearItems}
                    name="graduationYear"
                    value={draft.graduationYear || null}
                    onValueChange={value =>
                      updateField('graduationYear', typeof value === 'string' ? value : '')
                    }
                  >
                    <SelectTrigger
                      id="graduationYear"
                      aria-invalid={Boolean(fieldErrors.graduationYear)}
                      aria-describedby={
                        fieldErrors.graduationYear ? 'graduation-year-error' : undefined
                      }
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {graduationYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError id="graduation-year-error">{fieldErrors.graduationYear}</FieldError>
                </Field>
              </div>
            </FieldGroup>
          </ProfileCard>
        </div>
      </div>

      <footer className="paper-panel ink-shadow sticky bottom-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm" role="status" aria-live="polite">
          {mutation.isPending ? (
            <span className="text-muted-foreground">Saving your profile…</span>
          ) : saveMessage ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="text-primary size-4" />
              {saveMessage}
            </span>
          ) : isDirty ? (
            <span className="font-medium">You have unsaved changes.</span>
          ) : (
            <span className="text-muted-foreground">Your profile details are up to date.</span>
          )}
        </div>
        <Button type="submit" size="lg" disabled={mutation.isPending || !isDirty}>
          {mutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" aria-hidden="true" />
          )}
          {mutation.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </footer>
    </form>
  )
}
