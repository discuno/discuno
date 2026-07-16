import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'
import { BookingInterface } from './components/BookingInterface'

interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
    bookingState?: string
  }>
}

const BookingPage = async ({ params }: BookingPageProps) => {
  const { username } = await params
  const initialNowIso = new Date().toISOString()

  const profile = await getPublicProfileByUsername(username)
  if (!profile?.calcomUsername) notFound()

  const eventTypes = await getMentorEnabledEventTypesWithStripeStatus(profile.userId)
  if (eventTypes.length === 0) notFound()

  const bookingData = {
    userId: profile.userId,
    username,
    calcomUsername: profile.calcomUsername,
    name: profile.name ?? 'Mentor',
    image: profile.image ?? '',
    bio: profile.bio ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
    eventTypes: eventTypes.map(eventType => ({
      id: eventType.calcomEventTypeId,
      title: eventType.title,
      length: eventType.duration,
      description: eventType.description ?? undefined,
      price: eventType.customPrice ?? undefined,
      currency: eventType.currency,
    })),
  }

  return (
    <div className="page-container py-8 sm:py-10">
      <header className="mb-7">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/mentor/${username}`}>
            <ArrowLeft />
            Back to profile
          </Link>
        </Button>
        <p className="eyebrow mt-5">Choose your conversation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Find a time to talk with {profile.name ?? 'this mentor'}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          Pick the session and time that fit your question. You will see the details before you
          confirm.
        </p>
      </header>
      <BookingInterface bookingData={bookingData} variant="inline" initialNowIso={initialNowIso} />
    </div>
  )
}

export default BookingPage

export async function generateMetadata({ params }: BookingPageProps) {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)
  const mentorName = profile?.name ?? username

  return createMetadata({
    title: `Book a session with ${mentorName}`,
    description: `Choose a focused conversation and available time with ${mentorName}. Review the session details before you confirm.`,
    alternates: { canonical: `${siteConfig.url}/mentor/${username}` },
    robots: { index: false, follow: true },
  })
}
