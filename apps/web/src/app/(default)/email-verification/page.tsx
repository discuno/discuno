import { EmailInputForm } from '~/app/(default)/email-verification/EmailInputForm'
import { SentEmailVerification } from '~/app/(default)/email-verification/Sent'
import { StatusToast } from '~/components/shared/StatusToast'
import { requireUserId } from '~/lib/auth/auth-utils'
import { getProfile } from '~/server/queries'

const EmailVerificationPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) => {
  const { status } = await searchParams
  const id = await requireUserId()

  // Fetch the user's profile to determine if they have an existing eduEmail
  const isVerified = (await getProfile(id))?.isEduVerified

  // Render the SentEmailVerification component if the status is 'sent'
  if (status === 'sent') {
    return <SentEmailVerification />
  }

  // Render the EmailInputForm with the appropriate message and success flag
  return (
    <>
      <EmailInputForm isVerified={isVerified} />
      <StatusToast status={status ?? null} />
    </>
  )
}

export default EmailVerificationPage
