import { type Metadata } from 'next'
import { createMetadata } from '~/lib/metadata'
import { LoginPage } from './LoginPage'

export const metadata: Metadata = createMetadata({
  title: 'Sign In or Start Mentoring',
  description:
    'Sign in to keep your Discuno details handy, or use a supported school email to share your experience as a student mentor.',
  openGraph: {
    title: 'Sign in to Discuno',
    description:
      'Find guidance from someone who has been there, or share the college experience another student needs now.',
  },
  alternates: {
    canonical: 'https://discuno.com/auth',
  },
})

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>
}) {
  const { intent } = await searchParams

  return <LoginPage initialUserType={intent === 'student' ? 'student' : 'mentor'} />
}
