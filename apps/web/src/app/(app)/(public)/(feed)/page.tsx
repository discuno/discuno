import { type Metadata } from 'next'
import { FeedShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Firsthand Advice for Your Next College Decision',
  description:
    'Talk with a student who has navigated the school, major, internship, or decision in front of you. Find relevant firsthand perspective and choose your next move.',
  openGraph: {
    title: "Before your next college decision, talk to someone who's been there | Discuno",
    description:
      'Find a student with relevant firsthand experience, ask the question a search result cannot answer, and leave with a clearer next move.',
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
