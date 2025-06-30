import { VerificationResult } from '~/app/(default)/(verify)/verify-email/VerificationResult'
import { verifyEmail } from '~/app/(default)/(verify)/verify-email/verification'

interface VerificationPageProps {
  searchParams: Promise<{ token?: string }>
}

const VerificationPage = async ({ searchParams }: VerificationPageProps) => {
  const { token } = await searchParams

  if (!token) {
    return <VerificationResult success={false} message="Invalid token." />
  }

  await verifyEmail(token)

  const message = 'Email verified successfully!'
  return <VerificationResult success={true} message={message} />
}

export default VerificationPage
