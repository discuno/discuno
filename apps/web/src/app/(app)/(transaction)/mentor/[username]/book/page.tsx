import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookingInterface } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { DecisionContext } from '~/components/shared/DecisionContext'
import { buttonVariants } from '~/components/ui/button'
import { sanitizeDiscoveryReturnHref } from '~/lib/discovery-return'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { cn } from '~/lib/utils'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
    returnTo?: string
  }>
}

const BookingPage = async ({ params, searchParams }: BookingPageProps) => {
  const [{ username }, { eventType, returnTo }] = await Promise.all([params, searchParams])
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
  const discoveryReturnHref = sanitizeDiscoveryReturnHref(returnTo)
  const profileHref = `/mentor/${username}?returnTo=${encodeURIComponent(discoveryReturnHref)}`

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
    <div className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="border-foreground/18 border-b pb-7 sm:pb-9">
        <Link
          href={profileHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3')}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to profile
        </Link>
        <div className="mt-6">
          <DecisionContext
            compact
            editable={false}
            emptyTitle="Your question"
            emptyDescription="Choose a time, then add the question with your booking details."
          />
        </div>
      </div>

      <header className="mt-8 mb-7 max-w-2xl sm:mt-10 sm:mb-9">
        <h1 className="text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
          Choose a time with {profile.name ?? 'this mentor'}
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-7">
          Pick the session and time that fit. You will review every detail before confirming.
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
