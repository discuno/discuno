import { EmailInputForm } from '~/app/(default)/email-verification/EmailInputForm'
import { StatusToast } from '~/components/shared/StatusToast'
import { getProfile } from '~/server/queries'
import { SentEmailVerification } from '../Sent'

interface EmailVerificationContentProps {
  searchParams: { status?: string }
}

export const EmailVerificationContent = async ({ searchParams }: EmailVerificationContentProps) => {
  const { status } = searchParams

  // Early return for sent status
  if (status === 'sent') {
    return <SentEmailVerification />
  }

  let isVerified = false

  try {
    // Fetch the user's profile to determine verification status
    const { profile } = await getProfile()
    isVerified = profile?.isEduVerified ?? false
  } catch (error) {
    console.error('Failed to fetch profile:', error)
    // Continue with default verification status on error
    // This provides graceful degradation instead of breaking the component
  }

  return (
    <>
      <EmailInputForm isVerified={isVerified} />
      <StatusToast status={status ?? null} />
    </>
  )
}
