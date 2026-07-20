import 'server-only'

interface SchoolEmailVerificationInput {
  email: string | null
  emailVerified: boolean | null
  schoolDomainPrefix: string | null
}

/**
 * A generic verified-email flag is not enough to establish a school affiliation.
 * The verified address must also be a .edu address whose institution prefix matches
 * the mentor's active school association.
 */
export const hasVerifiedSchoolEmail = ({
  email,
  emailVerified,
  schoolDomainPrefix,
}: SchoolEmailVerificationInput): boolean => {
  if (!emailVerified || !email || !schoolDomainPrefix) return false

  const emailDomain = email.trim().toLowerCase().split('@')[1]
  const educationDomainMatch = emailDomain?.match(/([^.]+)\.edu$/)

  return educationDomainMatch?.[1] === schoolDomainPrefix.trim().toLowerCase()
}
