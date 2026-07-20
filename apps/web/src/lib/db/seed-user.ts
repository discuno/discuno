const MAX_USERNAME_LENGTH = 30

type SeedMentorUserInput = {
  firstName: string
  lastName: string
  index: number
  image: string
}

const normalizeUsernamePart = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createSeedMentorUser = ({
  firstName,
  lastName,
  index,
  image,
}: SeedMentorUserInput) => {
  if (!Number.isSafeInteger(index) || index < 0 || index >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Seed mentor index must be a non-negative safe integer')
  }

  const sequence = index + 1
  const suffix = `-${sequence}`
  const normalizedName = [firstName, lastName].map(normalizeUsernamePart).filter(Boolean).join('-')
  const availableBaseLength = MAX_USERNAME_LENGTH - suffix.length
  const usernameBase = (normalizedName || 'mentor')
    .slice(0, availableBaseLength)
    .replace(/-+$/g, '')
  const username = `${usernameBase || 'mentor'}${suffix}`
  const emailName = normalizedName.replace(/-/g, '.') || 'mentor'

  return {
    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
    email: `${emailName}${sequence}@university.edu`,
    username,
    displayUsername: username,
    emailVerified: true,
    role: 'mentor' as const,
    image,
  }
}
