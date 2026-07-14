import { type Metadata } from 'next'
import { FeedShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Student Mentors for Honest College Advice',
  description:
    'Find school-email-verified student mentors for firsthand advice on courses, campus life, internships, and career decisions. Browse and book without an account.',
  openGraph: {
    title: 'Get honest college advice from a student mentor | Discuno',
    description:
      'Compare student mentors by school, major, and graduation year, then choose a session and time that fits.',
  },
  alternates: { canonical: '/' },
})

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; major?: string; gradYear?: string }>
}) => {
  const params = await searchParams

  return <FeedShell searchParams={params} />
}

export default HomePage
