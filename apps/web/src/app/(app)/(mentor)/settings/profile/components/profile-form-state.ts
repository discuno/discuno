import type { FullUserProfile } from '~/app/types'
import { normalizeDiscunoUsername } from '~/lib/auth/username'

export const BIO_MAX_LENGTH = 1000
export const NAME_MAX_LENGTH = 255
export const PROFILE_REQUIREMENT_COUNT = 5

export const ACADEMIC_LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const

export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number]

export interface ProfileDraft {
  name: string
  username: string
  bio: string
  major: string
  schoolYear: AcademicLevel
  graduationYear: string
}

export type ProfileField = keyof ProfileDraft
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>

export interface ProfileRequirement {
  id: 'name' | 'username' | 'bio' | 'major' | 'image'
  label: string
  complete: boolean
}

const isCompleteName = (name: string): boolean => {
  const trimmedName = name.trim()
  return trimmedName.length > 0 && trimmedName.length <= NAME_MAX_LENGTH
}

const isCompleteUsername = (username: string): boolean => {
  const trimmedUsername = username.trim()
  return (
    trimmedUsername.length >= 3 &&
    trimmedUsername.length <= 30 &&
    /^[a-z0-9_-]+$/.test(trimmedUsername) &&
    /[a-z0-9]/.test(trimmedUsername)
  )
}

const isCompleteBio = (bio: string): boolean => {
  const trimmedBio = bio.trim()
  return trimmedBio.length > 0 && trimmedBio.length <= BIO_MAX_LENGTH
}

export const createProfileDraft = (
  profile: FullUserProfile,
  currentYear = new Date().getFullYear()
): ProfileDraft => ({
  name: profile.name ?? '',
  username: profile.username ?? '',
  bio: profile.bio ?? '',
  major: profile.major ?? '',
  schoolYear: profile.schoolYear,
  graduationYear: profile.graduationYear >= currentYear ? profile.graduationYear.toString() : '',
})

export const normalizeProfileUsername = (username: string): string =>
  normalizeDiscunoUsername(username)

export const getProfileRequirements = (
  draft: Pick<ProfileDraft, 'name' | 'username' | 'bio' | 'major'>,
  hasImage: boolean
): ProfileRequirement[] => [
  { id: 'name', label: 'Name', complete: isCompleteName(draft.name) },
  {
    id: 'username',
    label: 'Public username',
    complete: isCompleteUsername(draft.username),
  },
  { id: 'bio', label: 'Introduction', complete: isCompleteBio(draft.bio) },
  { id: 'major', label: 'Major', complete: draft.major.trim().length > 0 },
  { id: 'image', label: 'Profile photo', complete: hasImage },
]

export const getProfileReadiness = (
  draft: Pick<ProfileDraft, 'name' | 'username' | 'bio' | 'major'>,
  hasImage: boolean
) => {
  const requirements = getProfileRequirements(draft, hasImage)
  const completed = requirements.filter(requirement => requirement.complete).length

  return {
    requirements,
    completed,
    total: PROFILE_REQUIREMENT_COUNT,
    percent: Math.round((completed / PROFILE_REQUIREMENT_COUNT) * 100),
    isComplete: completed === PROFILE_REQUIREMENT_COUNT,
  }
}

export const validateProfileDraft = (
  draft: ProfileDraft,
  currentYear = new Date().getFullYear()
): ProfileFieldErrors => {
  const errors: ProfileFieldErrors = {}
  const trimmedName = draft.name.trim()
  const trimmedUsername = draft.username.trim()
  const trimmedBio = draft.bio.trim()

  if (!trimmedName) {
    errors.name = 'Add the name students should see.'
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `Keep your name to ${NAME_MAX_LENGTH} characters or fewer.`
  }

  if (!trimmedUsername) {
    errors.username = 'Choose a public username.'
  } else if (trimmedUsername.length < 3) {
    errors.username = 'Use at least 3 characters.'
  } else if (trimmedUsername.length > 30) {
    errors.username = 'Use no more than 30 characters.'
  } else if (!/^[a-z0-9_-]+$/.test(trimmedUsername)) {
    errors.username = 'Use lowercase letters, numbers, hyphens, or underscores.'
  } else if (!/[a-z0-9]/.test(trimmedUsername)) {
    errors.username = 'Include at least one letter or number.'
  }

  if (!trimmedBio) {
    errors.bio = 'Add a short introduction about the perspective you can share.'
  } else if (trimmedBio.length > BIO_MAX_LENGTH) {
    errors.bio = 'Keep your introduction to 1,000 characters or fewer.'
  }

  if (!draft.major.trim()) {
    errors.major = 'Choose your major or field of study.'
  }

  if (!ACADEMIC_LEVELS.includes(draft.schoolYear)) {
    errors.schoolYear = 'Choose your current academic level.'
  }

  const graduationYear = Number.parseInt(draft.graduationYear, 10)
  if (!draft.graduationYear || !Number.isInteger(graduationYear)) {
    errors.graduationYear = 'Choose your expected graduation year.'
  } else if (graduationYear < currentYear) {
    errors.graduationYear = 'Choose this year or a future graduation year.'
  }

  return errors
}

export const hasProfileDraftChanged = (draft: ProfileDraft, savedDraft: ProfileDraft): boolean =>
  (Object.keys(draft) as ProfileField[]).some(field => draft[field] !== savedDraft[field])
