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
  }>
}

const BookingPage = async ({ params, searchParams }: BookingPageProps) => {
  const [{ username }, { eventType }] = await Promise.all([params, searchParams])
  const initialNowIso = new Date().toISOString()

  const profile = await getPublicProfileByUsername(username)
  if (!profile?.calcomUsername) notFound()

  const eventTypes = await getMentorEnabledEventTypesWithStripeStatus(profile.userId)
  if (eventTypes.length === 0) notFound()
  const requestedEventTypeId = Number(eventType)
  const initialEventTypeId = eventTypes.some(
    candidate => candidate.calcomEventTypeId === requestedEventTypeId
  )
    ? requestedEventTypeId
    : undefined

  const bookingData = {
    username,
    name: profile.name ?? 'Mentor',
    image: profile.image ?? '',
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
    <div className="page-container py-8 sm:py-12">
      <header className="mb-7">
        <Button
          render={<Link href={`/mentor/${username}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-3"
        >
          <ArrowLeft />
          Back to profile
        </Button>
        <p className="note-stamp mt-5">Booking note · Choose your conversation</p>
        <h1 className="mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-5xl">
          Find a time to talk with{' '}
          <span className="marker-underline">{profile.name ?? 'this mentor'}</span>
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          Pick the session and time that fit your question. You will see the details before you
          confirm.
        </p>
      </header>
      <BookingInterface
        bookingData={bookingData}
        initialNowIso={initialNowIso}
        initialEventTypeId={initialEventTypeId}
      />
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
