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

  const result = await verifyEmail(token)

  return <VerificationResult success={result.success} message={result.message} />
}

export default VerificationPage
