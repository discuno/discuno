import { type Metadata } from 'next'
import { FeedShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Home',
  description:
    'Discover student mentors, explore mentorship opportunities, and connect with peers at top universities. Browse posts, find mentors, and book sessions.',
  openGraph: {
    title: 'Discuno - Connect with Student Mentors',
    description:
      'Discover student mentors, explore mentorship opportunities, and connect with peers at top universities.',
  },
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
