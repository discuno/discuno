import { EmailInputForm } from '~/app/(default)/email-verification/EmailInputForm'
import { SentEmailVerification } from '~/app/(default)/email-verification/Sent'
import { StatusToast } from '~/components/shared/StatusToast'
import { NotFoundError } from '~/lib/errors'
import { getProfile } from '~/server/queries'

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

  // Fetch the user's profile to determine verification status
  try {
    const { profile } = await getProfile()
    isVerified = profile?.isEduVerified ?? false
  } catch (error) {
    if (error instanceof NotFoundError) {
      isVerified = false
    } else {
      throw error
    }
  }

  return (
    <>
      <EmailInputForm isVerified={isVerified} />
      <StatusToast status={status ?? null} />
    </>
  )
}
