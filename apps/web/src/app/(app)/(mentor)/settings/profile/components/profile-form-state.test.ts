import { describe, expect, it } from 'vitest'
import type { FullUserProfile } from '~/app/types'
import {
  createProfileDraft,
  getProfileReadiness,
  hasProfileDraftChanged,
  normalizeProfileUsername,
  validateProfileDraft,
} from './profile-form-state'

const completeProfile: FullUserProfile = {
  userId: 'user-1',
  userProfileId: 1,
  username: 'alex-lee',
  email: 'alex@example.edu',
  emailVerified: true,
  bio: 'I can help you think through choosing a major and finding your first internship.',
  schoolYear: 'Junior',
  graduationYear: 2028,
  image: 'https://example.com/alex.jpg',
  name: 'Alex Lee',
  school: 'Example University',
  major: 'Computer Science',
  calcomUserId: null,
  calcomUsername: null,
}

describe('profile form state', () => {
  it('uses the same five fields as mentor onboarding readiness', () => {
    const draft = createProfileDraft(completeProfile, 2026)
    const readiness = getProfileReadiness(draft, true)

    expect(readiness).toMatchObject({ completed: 5, total: 5, percent: 100, isComplete: true })
    expect(readiness.requirements.map(requirement => requirement.id)).toEqual([
      'name',
      'username',
      'bio',
      'major',
      'image',
    ])
  })

  it('shows partial progress without treating whitespace as complete', () => {
    const readiness = getProfileReadiness(
      {
        name: 'Alex Lee',
        username: 'alex',
        bio: '   ',
        major: '',
      },
      false
    )

    expect(readiness).toMatchObject({ completed: 2, total: 5, percent: 40, isComplete: false })
  })

  it('returns actionable field errors, including the non-native major picker', () => {
    const draft = createProfileDraft(
      {
        ...completeProfile,
        name: '',
        username: '__',
        bio: '',
        major: null,
        graduationYear: 2025,
      },
      2026
    )

    expect(validateProfileDraft(draft, 2026)).toEqual({
      name: 'Add the name students should see.',
      username: 'Use at least 3 characters.',
      bio: 'Add a short introduction about the perspective you can share.',
      major: 'Choose your major or field of study.',
      graduationYear: 'Choose your expected graduation year.',
    })
  })

  it('normalizes the public route identity and detects unsaved changes', () => {
    const saved = createProfileDraft(completeProfile, 2026)
    const draft = { ...saved, username: normalizeProfileUsername('Alex Lee!') }

    expect(draft.username).toBe('alex-lee-')
    expect(hasProfileDraftChanged(draft, saved)).toBe(true)
    expect(hasProfileDraftChanged(saved, { ...saved })).toBe(false)
  })

  it('keeps the 1,000-character introduction limit in readiness and validation', () => {
    const draft = {
      ...createProfileDraft(completeProfile, 2026),
      bio: 'a'.repeat(1001),
    }

    expect(getProfileReadiness(draft, true).isComplete).toBe(false)
    expect(validateProfileDraft(draft, 2026).bio).toBe(
      'Keep your introduction to 1,000 characters or fewer.'
    )
  })
})
