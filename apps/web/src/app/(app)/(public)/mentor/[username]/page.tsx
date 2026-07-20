import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DecisionContext } from '~/components/shared/DecisionContext'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '~/components/ui/item'
import { Separator } from '~/components/ui/separator'
import { sanitizeDiscoveryReturnHref } from '~/lib/discovery-return'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { cn } from '~/lib/utils'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

interface MentorProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ checkout?: string; returnTo?: string }>
}

export default async function MentorProfilePage({ params, searchParams }: MentorProfilePageProps) {
  const [{ username }, { checkout, returnTo }] = await Promise.all([params, searchParams])
  const profile = await getPublicProfileByUsername(username)

  if (!profile) notFound()

  const eventTypes = await getMentorEnabledEventTypesWithStripeStatus(profile.userId)
  const hasBooking = eventTypes.length > 0 && Boolean(profile.calcomUsername)
  const name = profile.name ?? 'Student mentor'
  const firstName = name.trim().split(/\s+/).find(Boolean) ?? 'this mentor'
  const initial = name.trim().charAt(0).toUpperCase() || 'M'
  const discoveryReturnHref = sanitizeDiscoveryReturnHref(returnTo)
  const encodedReturnHref = encodeURIComponent(discoveryReturnHref)
  const academicLine = [profile.major, profile.school].filter(Boolean).join(' · ')
  const academicStage = [
    profile.schoolYear,
    profile.graduationYear ? `Class of ${profile.graduationYear}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${siteConfig.url}/mentor/${username}`,
    mainEntity: {
      '@type': 'Person',
      name,
      description: profile.bio ?? undefined,
      image: profile.image ?? undefined,
      url: `${siteConfig.url}/mentor/${username}`,
      affiliation: profile.school
        ? {
            '@type': 'EducationalOrganization',
            name: profile.school,
          }
        : undefined,
      knowsAbout: profile.major ? [profile.major] : undefined,
    },
  }

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header className="page-shell py-8 sm:py-12 lg:py-14">
        <Link
          href={discoveryReturnHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3')}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to mentors
        </Link>

        <div className="mt-8 grid gap-7 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-9 lg:mt-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <Avatar className="size-36 sm:size-44 lg:size-52">
            <AvatarImage src={profile.image ?? ''} alt={`${name} profile photo`} />
            <AvatarFallback>
              <span className="text-5xl font-semibold" aria-hidden="true">
                {initial}
              </span>
            </AvatarFallback>
          </Avatar>

          <div className="max-w-3xl min-w-0">
            {profile.schoolEmailVerified && <Badge variant="outline">School email confirmed</Badge>}
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              {name}
            </h1>
            {academicLine && <p className="mt-5 text-lg leading-7">{academicLine}</p>}
            {academicStage && (
              <p className="text-muted-foreground mt-1.5 text-sm">{academicStage}</p>
            )}
          </div>
        </div>

        <Separator className="mt-10" />
        <div className="py-6 sm:py-8">
          <DecisionContext
            compact
            emptyTitle="Your question"
            emptyDescription={`Add the decision you may want to discuss with ${firstName}.`}
          />
        </div>
        <Separator />
      </header>

      {(checkout === 'cancelled' || checkout === 'cancel_error') && (
        <div className="page-shell pb-2">
          <Alert variant={checkout === 'cancel_error' ? 'destructive' : 'default'}>
            <CircleAlert />
            <AlertTitle>
              {checkout === 'cancel_error'
                ? 'We could not confirm checkout was closed'
                : 'Checkout cancelled'}
            </AlertTitle>
            <AlertDescription>
              {checkout === 'cancel_error' ? (
                <p>
                  Do not start another payment for the same time yet.{' '}
                  <Link href="/support">Contact support</Link> so we can check it safely.
                </p>
              ) : (
                <p>No session was booked. Choose another time whenever you&apos;re ready.</p>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="page-shell grid gap-12 pb-14 sm:pb-20 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)] lg:gap-20 lg:pb-24">
        <section aria-labelledby="mentor-help-heading">
          <h2
            id="mentor-help-heading"
            className="text-2xl leading-tight font-semibold tracking-tight"
          >
            What {firstName} can help with
          </h2>
          <p className="text-muted-foreground mt-5 max-w-[42rem] text-base leading-8 whitespace-pre-wrap">
            {profile.bio ?? `${firstName} hasn’t added an introduction yet.`}
          </p>
        </section>

        <section aria-labelledby="session-options-heading">
          <div className="max-w-2xl">
            <h2
              id="session-options-heading"
              className="text-2xl leading-tight font-semibold tracking-tight"
            >
              Choose a session
            </h2>
            {hasBooking && (
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Select one to see {firstName}&apos;s available times.
              </p>
            )}
          </div>

          {hasBooking ? (
            <ItemGroup className="mt-6 gap-0 border-y" aria-label={`Sessions with ${firstName}`}>
              {eventTypes.map((eventType, index) => (
                <div key={eventType.calcomEventTypeId} role="listitem">
                  {index > 0 && <ItemSeparator className="my-0" />}
                  <Item
                    render={
                      <Link
                        href={`/mentor/${username}/book?eventType=${eventType.calcomEventTypeId}&returnTo=${encodedReturnHref}`}
                      />
                    }
                    className="rounded-none border-0 px-0 py-5 sm:flex-nowrap"
                  >
                    <ItemContent className="min-w-0 gap-1.5">
                      <ItemTitle
                        role="heading"
                        aria-level={3}
                        className="line-clamp-none text-base"
                      >
                        {eventType.title}
                      </ItemTitle>
                      {eventType.description && (
                        <ItemDescription className="line-clamp-2 leading-6">
                          {eventType.description}
                        </ItemDescription>
                      )}
                    </ItemContent>
                    <ItemActions className="basis-full justify-between sm:basis-auto sm:flex-col sm:items-end">
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {formatSessionPrice(eventType.customPrice, eventType.currency)} ·{' '}
                        {eventType.duration} min
                      </span>
                      <span className="text-primary flex items-center gap-1.5 text-sm font-semibold">
                        See times
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                    </ItemActions>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          ) : (
            <Empty className="mt-6 border-y">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>No sessions are open right now</EmptyTitle>
                <EmptyDescription>Browse other mentors or check back later.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href={discoveryReturnHref} className={buttonVariants({ variant: 'outline' })}>
                  Browse other mentors
                </Link>
              </EmptyContent>
            </Empty>
          )}
        </section>
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: MentorProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)

  if (!profile)
    return createMetadata({ title: 'Mentor profile not found', robots: { index: false } })

  const role = profile.major ? `${profile.major} student mentor` : 'student mentor'
  const location = profile.school ? ` at ${profile.school}` : ''
  const fallbackDescription = `Meet ${profile.name ?? 'a student mentor'}, a ${role}${location}, and view their available conversation options.`
  const description = profile.bio?.trim() ? profile.bio.trim().slice(0, 155) : fallbackDescription
  const canonical = `${siteConfig.url}/mentor/${username}`

  return createMetadata({
    title: `${profile.name ?? 'Student mentor'} | ${role}${location}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title: `${profile.name ?? 'Student mentor'} on Discuno`,
      description,
      url: canonical,
      images: profile.image
        ? [{ url: profile.image, alt: profile.name ?? 'Student mentor' }]
        : undefined,
    },
    twitter: {
      title: `${profile.name ?? 'Student mentor'} on Discuno`,
      description,
      images: profile.image ? [profile.image] : undefined,
    },
  })
}

function formatSessionPrice(price: number | null, currency: string) {
  if (!price) return 'Free'
  return formatCurrencyFromCents(price, currency)
}
