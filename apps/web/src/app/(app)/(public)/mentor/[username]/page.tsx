import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  GraduationCap,
  LockKeyhole,
  School,
  ShieldCheck,
  Video,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { getMentorEnabledEventTypesWithStripeStatus } from '~/server/queries/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'

interface MentorProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function MentorProfilePage({ params }: MentorProfilePageProps) {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)

  if (!profile) notFound()

  const eventTypes = await getMentorEnabledEventTypesWithStripeStatus(profile.userId)
  const hasBooking = eventTypes.length > 0 && Boolean(profile.calcomUsername)
  const bookingData =
    hasBooking && profile.calcomUsername
      ? {
          userId: profile.userId,
          username,
          calcomUsername: profile.calcomUsername,
          name: profile.name ?? 'Student mentor',
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
      : null

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

      <div className="bg-card border-b">
        <div className="page-container py-5">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/#mentors">
              <ArrowLeft />
              Back to mentors
            </Link>
          </Button>
        </div>
      </div>

      <div className="page-container py-10 sm:py-14">
        <header className="grid gap-7 border-b pb-10 md:grid-cols-[auto_1fr] md:items-center">
          <Avatar className="border-card h-28 w-28 border-4 shadow-[0_8px_24px_rgba(15,23,42,0.12)] sm:h-32 sm:w-32">
            <AvatarImage
              src={profile.image ?? ''}
              alt={`${profile.name ?? 'Mentor'} profile photo`}
            />
            <AvatarFallback className="bg-secondary text-primary text-4xl font-semibold">
              {profile.name?.charAt(0).toUpperCase() ?? 'M'}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Student mentor</Badge>
              {profile.schoolEmailVerified && (
                <Badge className="badge-success-muted">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  School email verified
                </Badge>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              {profile.name ?? 'Student mentor'}
            </h1>
            <div className="text-muted-foreground mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
              {profile.school && (
                <span className="text-foreground flex items-center gap-2 font-medium">
                  <School className="text-primary h-4 w-4" />
                  {profile.school}
                </span>
              )}
              {profile.major && (
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {profile.major}
                </span>
              )}
              {profile.graduationYear && (
                <span>
                  {profile.schoolYear} · Class of {profile.graduationYear}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="about-mentor">
              <p className="eyebrow">About</p>
              <h2 id="about-mentor" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                Meet {profile.name?.split(' ')[0] ?? 'this mentor'}
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
                    Choose the conversation you need
                  </h2>
                </div>
                {eventTypes.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    Price and duration shown before booking
                  </p>
                )}
              </div>

              {eventTypes.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {eventTypes.map(eventType => (
                    <div
                      key={eventType.calcomEventTypeId}
                      className="bg-card rounded-xl border p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold">{eventType.title}</h3>
                        <span className="text-primary shrink-0 text-sm font-semibold">
                          {formatSessionPrice(eventType.customPrice, eventType.currency)}
                        </span>
                      </div>
                      {eventType.description && (
                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                          {eventType.description}
                        </p>
                      )}
                      <div className="text-muted-foreground mt-4 flex items-center gap-4 border-t pt-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {eventType.duration} minutes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5" />
                          Video call
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card mt-6 rounded-xl border border-dashed p-6">
                  <p className="font-medium">No sessions are available right now.</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    This mentor may be updating their availability. Check back later or browse
                    another profile.
                  </p>
                </div>
              )}
            </section>

            <section
              className="bg-secondary rounded-xl p-6 sm:p-8"
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
            <div className="bg-card rounded-xl border p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">Book with {profile.name?.split(' ')[0] ?? 'this mentor'}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                See available times
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                Choose a session, date, and time. You can complete the booking as a guest.
              </p>

              {bookingData ? (
                <BookingModal bookingData={bookingData} className="mt-6 w-full">
                  <CalendarDays />
                  View availability
                </BookingModal>
              ) : (
                <Button className="mt-6 w-full" disabled>
                  Booking unavailable
                </Button>
              )}

              <div className="text-muted-foreground mt-6 space-y-3 border-t pt-5 text-xs leading-5">
                <p className="flex items-start gap-2">
                  <CalendarDays className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Availability comes directly from the mentor&apos;s calendar.
                </p>
                <p className="flex items-start gap-2">
                  <LockKeyhole className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  You only provide the details needed to confirm the session.
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Paid sessions are completed through Stripe checkout.
                </p>
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
  const fallbackDescription = `Meet ${profile.name ?? 'a student mentor'}, a ${role}${location}, and view available mentorship sessions.`
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
