import { type Metadata } from 'next'
import { createMetadata } from '~/lib/metadata'
import { LoginPage } from './LoginPage'

export const metadata: Metadata = createMetadata({
  title: 'Become a Mentor',
  description:
    'Join Discuno as a student mentor. Share your college experience, help fellow students succeed, and earn money while making a difference. Sign in with your .edu email to get started.',
  openGraph: {
    title: 'Become a Mentor on Discuno',
    description:
      'Share your college experience and earn money by mentoring students. Join our verified community of student mentors.',
  },
  alternates: {
    canonical: 'https://discuno.com/auth',
  },
})

export default async function AuthPage() {
  return (
    <main>
      <LoginPage />
    </main>
  )
}
