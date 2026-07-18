import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buttonVariants } from '~/components/ui/button'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'
import { cn } from '~/lib/utils'
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-6 max-w-2xl sm:mb-8">
        <Link
          href={`/mentor/${username}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3')}
        >
          <ArrowLeft />
          Back to profile
        </Link>
        <h1 className="font-display mt-6 text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
          Book a session with {profile.name ?? 'this mentor'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6 sm:text-base">
          Choose a session and an available time. Review everything before you confirm.
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
    description: `Choose a session and available time with ${mentorName}.`,
    alternates: { canonical: `${siteConfig.url}/mentor/${username}` },
    robots: { index: false, follow: true },
  })
}
