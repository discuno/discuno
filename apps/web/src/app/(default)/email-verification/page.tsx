import { EmailVerificationShell } from './components/EmailVerificationShell'

const EmailVerificationPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) => {
  const params = await searchParams

  return <EmailVerificationShell searchParams={params} />
}

export default EmailVerificationPage
