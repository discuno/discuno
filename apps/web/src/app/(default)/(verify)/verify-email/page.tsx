import { VerificationResult } from '~/app/(default)/(verify)/verify-email/VerificationResult'
import { verifyEmail } from '~/app/(default)/(verify)/verify-email/verification'
import { AppError } from '~/lib/auth/auth-utils'

interface VerificationPageProps {
  searchParams: Promise<{ token?: string }>
}
const VerificationPage = async ({ searchParams }: VerificationPageProps) => {
  const { token } = await searchParams
  if (!token) {
    return <VerificationResult success={false} message="Invalid token." />
  }
  try {
    await verifyEmail(token)

    const message = 'Email verified successfully!'
    return <VerificationResult success={true} message={message} />
  } catch (err: unknown) {
    console.error('Email verification error:', err)
    const message = err instanceof AppError ? err.message : 'Something went wrong. Please try again'
    return <VerificationResult success={false} message={message} />
  }
}

export default VerificationPage
