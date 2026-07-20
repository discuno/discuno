import { type Metadata } from 'next'
import { redirect } from 'next/navigation'
import { FeedShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Talk Through Your Next College Decision',
  description:
    'Bring one college decision to a student who has faced something similar, then choose your next move.',
  openGraph: {
    title: "Before you choose, talk to someone who's been there | Discuno",
    description: 'Name the question, find a student who has been there, and choose your next move.',
  },
  alternates: { canonical: '/' },
})

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; major?: string; gradYear?: string }>
}) => {
  const params = await searchParams
  const filters = new URLSearchParams()

  for (const key of ['school', 'major', 'gradYear'] as const) {
    const value = params[key]
    if (value) filters.set(key, value)
  }

  if (filters.size > 0) redirect(`/find?${filters.toString()}`)

  return <FeedShell />
}

export default HomePage
