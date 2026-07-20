import { type Metadata } from 'next'
import { resolveReauthenticationReturnTo } from '~/lib/auth/config'
import { createMetadata } from '~/lib/metadata'
import { LoginPage } from './LoginPage'

export const metadata: Metadata = createMetadata({
  title: 'Sign in',
  description: 'Sign in to Discuno as a student or mentor.',
  openGraph: {
    title: 'Sign in to Discuno',
    description: 'Sign in to your Discuno account.',
  },
  alternates: {
    canonical: 'https://discuno.com/auth',
  },
})

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; reauth?: string; returnTo?: string }>
}) {
  const { intent, reauth, returnTo } = await searchParams
  const reauthenticationRequired = reauth === '1'

  return (
    <LoginPage
      initialUserType={intent === 'student' ? 'student' : 'mentor'}
      reauthenticationRequired={reauthenticationRequired}
      returnTo={returnTo ? resolveReauthenticationReturnTo(returnTo) : undefined}
    />
  )
}
