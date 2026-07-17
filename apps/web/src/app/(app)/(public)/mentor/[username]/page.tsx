import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  Clock3,
  GraduationCap,
  LockKeyhole,
  School,
  ShieldCheck,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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
  ItemFooter,
  ItemGroup,
  ItemTitle,
} from '~/components/ui/item'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { createMetadata, siteConfig } from '~/lib/metadata'
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

      <section className="soft-grid border-foreground/20 relative overflow-hidden border-b-2">
        <div
          className="bg-highlight/80 pointer-events-none absolute top-16 right-[8%] hidden h-3 w-28 rotate-2 border lg:block"
          aria-hidden
        />
        <div className="page-container relative py-6 sm:py-10">
          <Button
            render={<Link href="/#mentors" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="-ml-3"
          >
            <ArrowLeft data-icon="inline-start" />
            Back to mentors
          </Button>
          <header className="mt-6 grid gap-6 md:grid-cols-[auto_1fr] md:items-center lg:mt-8">
            <Avatar className="border-foreground/20 size-28 rounded-xl border-2 shadow-[4px_4px_0_rgba(13,20,39,0.14)] sm:size-36">
              <AvatarImage
                src={profile.image ?? ''}
                alt={`${profile.name ?? 'Mentor'} profile photo`}
                className="rounded-[calc(var(--radius)+2px)]"
              />
              <AvatarFallback className="bg-secondary text-primary rounded-[calc(var(--radius)+2px)] text-4xl font-semibold">
                {profile.name?.charAt(0).toUpperCase() ?? 'M'}
              </AvatarFallback>
            </Avatar>

            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Student mentor</Badge>
                {profile.schoolEmailVerified && (
                  <Badge variant="outline" className="badge-success-muted">
                    <BadgeCheck className="size-3.5" />
                    School email confirmed
                  </Badge>
                )}
              </div>
              <h1 className="display-title mt-4 text-4xl sm:text-5xl lg:text-6xl">
                {profile.name ?? 'Student mentor'}
              </h1>
              <div className="paper-panel text-muted-foreground mt-5 flex w-fit max-w-full flex-col gap-2 px-3.5 py-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
                {profile.school && (
                  <span className="text-foreground flex items-center gap-2 font-medium">
                    <School className="text-primary size-4" />
                    {profile.school}
                  </span>
                )}
                {profile.major && (
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    {profile.major}
                  </span>
                )}
                {profile.graduationYear && (
                  <span>
                    {profile.schoolYear} · Class of {profile.graduationYear}
                  </span>
                )}
              </div>

              {hasBooking && (
                <Button
                  render={<Link href={`/mentor/${username}/book`} />}
                  nativeButton={false}
                  size="lg"
                  className="mt-6 w-full sm:w-auto lg:hidden"
                >
                  See available times
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          </header>
        </div>
      </section>

      {(checkout === 'cancelled' || checkout === 'cancel_error') && (
        <div className="page-container pt-6">
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

      <div className="page-container py-10 sm:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-12">
            <section aria-labelledby="about-mentor">
              <p className="eyebrow">About</p>
              <h2 id="about-mentor" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                The perspective {firstName} brings
              </h2>
              {profile.bio ? (
                <p className="text-muted-foreground mt-4 max-w-3xl text-base leading-8 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-muted-foreground mt-4 leading-7">
                  This mentor has not added an introduction yet. Review their academic background
                  and session options before booking.
                </p>
              )}
            </section>

            <section aria-labelledby="session-options">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow">Session options</p>
                  <h2
                    id="session-options"
                    className="mt-3 text-2xl font-semibold tracking-[-0.03em]"
                  >
                    What you can talk through together
                  </h2>
                </div>
                {hasBooking && (
                  <p className="text-muted-foreground text-sm">Start with the question you have</p>
                )}
              </div>

              {hasBooking ? (
                <ItemGroup className="mt-6 grid gap-4 sm:grid-cols-2">
                  {eventTypes.map(eventType => (
                    <div key={eventType.calcomEventTypeId} role="listitem">
                      <Item
                        render={
                          <Link
                            href={`/mentor/${username}/book?eventType=${eventType.calcomEventTypeId}`}
                          />
                        }
                        variant="outline"
                        className="question-slip interactive-card h-full items-stretch p-5"
                      >
                        <ItemContent>
                          <ItemTitle className="line-clamp-none text-base">
                            {eventType.title}
                          </ItemTitle>
                          {eventType.description && (
                            <ItemDescription className="mt-1 line-clamp-3 leading-6">
                              {eventType.description}
                            </ItemDescription>
                          )}
                        </ItemContent>
                        <ItemActions className="ml-auto self-start">
                          <span className="text-primary text-sm font-semibold">
                            {formatSessionPrice(eventType.customPrice, eventType.currency)}
                          </span>
                        </ItemActions>
                        <ItemFooter className="border-foreground/15 text-muted-foreground mt-2 border-t pt-4 text-xs">
                          <span className="flex items-center gap-1.5">
                            <Clock3 className="size-3.5" />
                            {eventType.duration} minutes
                          </span>
                          <span className="text-primary flex items-center gap-1 font-semibold">
                            Choose
                            <ArrowRight className="size-3.5" />
                          </span>
                        </ItemFooter>
                      </Item>
                    </div>
                  ))}
                </ItemGroup>
              ) : (
                <Empty className="bg-card mt-6 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarDays />
                    </EmptyMedia>
                    <EmptyTitle>No sessions are available right now</EmptyTitle>
                    <EmptyDescription>
                      This mentor may be updating their availability. You can check back later or
                      find another student with relevant experience.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      render={<Link href="/#mentors" />}
                      nativeButton={false}
                      variant="outline"
                    >
                      Browse other mentors
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </section>

            <section
              className="field-notes paper-panel corner-mark p-6 sm:p-8"
              aria-labelledby="prepare-session"
            >
              <p className="eyebrow">Make it useful</p>
              <h2 id="prepare-session" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                Bring one decision, not a perfect agenda.
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Share the context, what you have already tried, and the choice you are weighing. A
                specific question gives your mentor something concrete to work through with you.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="surface-panel stacked-note corner-mark p-6">
              <p className="eyebrow">Talk with {firstName}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                Ready to talk it through?
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                Choose the conversation that fits your question, then find a time that works.
              </p>

              {hasBooking ? (
                <Button
                  render={<Link href={`/mentor/${username}/book`} />}
                  nativeButton={false}
                  size="lg"
                  className="mt-6 w-full"
                >
                  <CalendarDays data-icon="inline-start" />
                  See available times
                </Button>
              ) : (
                <Button size="lg" className="mt-6 w-full" disabled>
                  Booking unavailable
                </Button>
              )}

              <div className="text-muted-foreground border-foreground/15 mt-6 flex flex-col gap-3 border-t pt-5 text-xs leading-5">
                <p className="flex items-start gap-2">
                  <CalendarDays className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  See the session length, price, and available times before you confirm.
                </p>
                <p className="flex items-start gap-2">
                  <LockKeyhole className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Bring one real question; you do not need a perfect agenda.
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  For paid sessions, card details are handled securely at checkout.
                </p>
                {profile.schoolEmailVerified && (
                  <p className="border-foreground/15 mt-1 border-t pt-4">
                    “School email confirmed” means this mentor accessed a supported institutional
                    email address. It does not verify identity, background, expertise, or outcomes.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
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
    title: `${profile.name ?? 'Student mentor'} — ${role}${location}`,
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
