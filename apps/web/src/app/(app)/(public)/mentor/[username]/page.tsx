import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Clock3 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { Separator } from '~/components/ui/separator'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { cn } from '~/lib/utils'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

interface MentorProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ checkout?: string }>
}

export default async function MentorProfilePage({ params, searchParams }: MentorProfilePageProps) {
  const [{ username }, { checkout }] = await Promise.all([params, searchParams])
  const profile = await getPublicProfileByUsername(username)

  if (!profile) notFound()

  const eventTypes = await getMentorEnabledEventTypesWithStripeStatus(profile.userId)
  const hasBooking = eventTypes.length > 0 && Boolean(profile.calcomUsername)
  const firstName = profile.name?.split(' ')[0] ?? 'this mentor'

  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${siteConfig.url}/mentor/${username}`,
    mainEntity: {
      '@type': 'Person',
      name: profile.name ?? 'Student mentor',
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header className="mx-auto w-full max-w-[76rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <Link
          href="/#mentors"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3')}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to mentors
        </Link>

        <div className="mt-8 grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center lg:mt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <Avatar className="size-32 rounded-xl after:rounded-xl sm:size-40 md:size-48 lg:size-60">
            <AvatarImage
              src={profile.image ?? ''}
              alt={`${profile.name ?? 'Mentor'} profile photo`}
              className="rounded-xl object-top"
            />
            <AvatarFallback className="rounded-xl text-4xl font-semibold sm:text-5xl">
              {profile.name?.charAt(0).toUpperCase() ?? 'M'}
            </AvatarFallback>
          </Avatar>

          <div className="max-w-3xl min-w-0">
            {profile.schoolEmailVerified && <Badge variant="outline">School email confirmed</Badge>}
            <h1 className="font-display mt-4 text-4xl leading-[0.95] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
              {profile.name ?? 'Student mentor'}
            </h1>

            <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
              {profile.school && (
                <div className="flex max-w-full min-w-0 flex-col gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">School</dt>
                  <dd className="font-medium break-words">{profile.school}</dd>
                </div>
              )}
              {profile.major && (
                <div className="flex max-w-full min-w-0 flex-col gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">Field of study</dt>
                  <dd className="break-words">{profile.major}</dd>
                </div>
              )}
              {profile.graduationYear && (
                <div className="flex min-w-0 flex-col gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">Year</dt>
                  <dd>
                    {profile.schoolYear} · Class of {profile.graduationYear}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </header>

      <Separator />

      {(checkout === 'cancelled' || checkout === 'cancel_error') && (
        <div className="mx-auto w-full max-w-[76rem] px-4 pt-6 sm:px-6 lg:px-8">
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
                  <Link href="/support">Contact support</Link> so we can check the checkout safely.
                </p>
              ) : (
                <p>No session was confirmed. You can choose a time again whenever you’re ready.</p>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[76rem] items-start gap-12 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:px-8 lg:py-16">
        <div className="flex min-w-0 flex-col gap-10 sm:gap-12">
          <section aria-labelledby="about-mentor">
            <h2 id="about-mentor" className="font-sans text-2xl font-semibold tracking-tight">
              About {firstName}
            </h2>
            {profile.bio ? (
              <p className="text-muted-foreground mt-4 max-w-[42rem] text-base leading-8 whitespace-pre-wrap">
                {profile.bio}
              </p>
            ) : (
              <p className="text-muted-foreground mt-4 max-w-[42rem] leading-7">
                This mentor has not added an introduction yet. Review their academic background and
                session options before booking.
              </p>
            )}
          </section>

          <Separator />

          <section aria-labelledby="session-options">
            <h2 id="session-options" className="font-sans text-2xl font-semibold tracking-tight">
              Sessions with {firstName}
            </h2>
            {hasBooking && (
              <p className="text-muted-foreground mt-2 text-sm">
                Choose a session to see available times.
              </p>
            )}

            {hasBooking ? (
              <ul className="mt-5">
                {eventTypes.map((eventType, index) => (
                  <li key={eventType.calcomEventTypeId}>
                    <Link
                      href={`/mentor/${username}/book?eventType=${eventType.calcomEventTypeId}`}
                      className="hover:bg-muted/60 focus-visible:bg-muted/60 group -mx-3 grid gap-4 rounded-lg px-3 py-5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"
                    >
                      <div className="min-w-0">
                        <h3 className="group-hover:text-primary text-base font-semibold transition-colors">
                          {eventType.title}
                        </h3>
                        {eventType.description && (
                          <p className="text-muted-foreground mt-1.5 line-clamp-2 max-w-2xl text-sm leading-6">
                            {eventType.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:min-w-44 sm:justify-end">
                        <span className="font-semibold">
                          {formatSessionPrice(eventType.customPrice, eventType.currency)}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <Clock3 className="size-4" aria-hidden="true" />
                          {eventType.duration} minutes
                        </span>
                        <span className="text-primary flex items-center gap-1.5 text-sm font-semibold sm:basis-full sm:justify-end">
                          See times
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                    {index < eventTypes.length - 1 && <Separator />}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="mt-6 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>No sessions are available right now</EmptyTitle>
                  <EmptyDescription>
                    This mentor may be updating their availability. You can check back later or find
                    another student with relevant experience.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/#mentors" className={buttonVariants({ variant: 'outline' })}>
                    Browse other mentors
                  </Link>
                </EmptyContent>
              </Empty>
            )}
          </section>
        </div>

        <aside aria-labelledby="booking-decision" className="lg:sticky lg:top-24">
          <div className="bg-card rounded-lg border p-5 sm:p-6">
            <h2 id="booking-decision" className="font-sans text-xl font-semibold tracking-tight">
              Book with {firstName}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {hasBooking
                ? `${eventTypes.length} ${eventTypes.length === 1 ? 'session is' : 'sessions are'} available.`
                : 'This mentor is not accepting bookings right now.'}
            </p>

            {hasBooking ? (
              <Link
                href={`/mentor/${username}/book`}
                className={cn(buttonVariants({ size: 'lg' }), 'mt-5 w-full')}
              >
                See available times
                <ArrowRight data-icon="inline-end" />
              </Link>
            ) : (
              <Button size="lg" className="mt-5 w-full" disabled>
                Booking unavailable
              </Button>
            )}

            <Separator className="my-5" />

            <div className="text-muted-foreground flex flex-col gap-3 text-xs leading-5">
              <p>See the session length, price, and available times before you confirm.</p>
              <p>For paid sessions, card details are handled securely at checkout.</p>
              {profile.schoolEmailVerified && (
                <>
                  <Separator />
                  <p>
                    “School email confirmed” means this mentor accessed a supported institutional
                    email address. It does not verify identity, background, expertise, or outcomes.
                  </p>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
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
