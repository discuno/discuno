import { Booker } from '@discuno/atoms'
import { GraduationCap } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getFullProfile } from '~/server/queries'

interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
  }>
}

async function BookingPageContent({ params, searchParams }: BookingPageProps) {
  // Await the params and searchParams
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  // In a real app, you'd fetch the user by username
  // For now, we'll mock this by using a user ID
  const profile = await getFullProfile('user-123')

  if (!profile) {
    notFound()
  }

  const eventTypeSlug = resolvedSearchParams.eventType ?? '30min'

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto max-w-6xl p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Mentor Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.image ?? ''} alt={profile.name ?? ''} />
                    <AvatarFallback className="text-lg">
                      {profile.name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('') ?? 'M'}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h1 className="text-foreground text-2xl font-bold">
                      {profile.name ?? 'Mentor'}
                    </h1>
                    <p className="text-muted-foreground">Mentor & Advisor</p>
                  </div>

                  <div className="w-full space-y-2">
                    {profile.school && (
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4" />
                        <span>{profile.school}</span>
                      </div>
                    )}

                    {profile.major && (
                      <Badge variant="secondary" className="text-xs">
                        {profile.major}
                      </Badge>
                    )}
                  </div>

                  {profile.bio && (
                    <div className="w-full">
                      <h3 className="mb-2 font-semibold">About</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Interface */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-foreground mb-2 text-3xl font-bold">Book a Meeting</h2>
              <p className="text-muted-foreground">
                Schedule a one-on-one mentoring session with{' '}
                {profile.name?.split(' ')[0] ?? 'this mentor'}
              </p>
            </div>

            <CalProviderWrapper>
              <Suspense fallback={<BookingSkeleton />}>
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <Booker
                    username={resolvedParams.username}
                    eventTypeSlug={eventTypeSlug}
                    layout="desktop"
                    onBookingComplete={booking => {
                      console.log('Booking completed:', booking)
                      // Could redirect to confirmation page or show success message
                    }}
                    onError={error => {
                      console.error('Booking error:', error)
                      // Could show error toast or redirect to error page
                    }}
                    className="min-h-[600px] w-full"
                  />
                </div>
              </Suspense>
            </CalProviderWrapper>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6 shadow-sm">
      <div className="animate-pulse space-y-6">
        <div className="bg-muted h-8 w-1/3 rounded"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="bg-muted h-12 rounded"></div>
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-muted h-10 w-20 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BookingPage(props: BookingPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingPageContent {...props} />
    </Suspense>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BookingPageProps) {
  const resolvedParams = await params
  return {
    title: `Book a Meeting with ${resolvedParams.username} | Discuno`,
    description: `Schedule a mentoring session with ${resolvedParams.username} on Discuno.`,
  }
}
