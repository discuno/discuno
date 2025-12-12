import { Calendar, GraduationCap, School } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { getEventTypesByUserId } from '~/server/dal/event-types'
import { getPublicProfileByUsername } from '~/server/queries/profiles'
import { BookingModal } from './book/components/BookingModal'

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)

  if (!profile) notFound()

  const eventTypes = await getEventTypesByUserId(profile.userId)
  const hasBooking = eventTypes.length > 0 && profile.calcomUsername

  const bookingData = hasBooking
    ? {
        userId: profile.userId,
        username,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        calcomUsername: profile.calcomUsername!,
        name: profile.name ?? 'Mentor',
        image: profile.image ?? '',
        bio: profile.bio ?? '',
        school: profile.school ?? '',
        major: profile.major ?? '',
      }
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-muted/20 pb-20 pt-24 lg:pb-32 lg:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with Glow */}
            <div className="relative mb-8">
              <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl" />
              <Avatar className="relative z-10 h-40 w-40 border-8 border-background shadow-2xl">
                <AvatarImage src={profile.image ?? ''} alt={profile.name ?? ''} />
                <AvatarFallback className="text-4xl">{profile.name?.charAt(0) ?? 'M'}</AvatarFallback>
              </Avatar>
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {profile.name}
            </h1>

            <div className="mb-8 flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="px-4 py-1.5 text-base">
                {profile.school}
              </Badge>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 px-4 py-1.5 text-base">
                {profile.major}
              </Badge>
            </div>

            {hasBooking && bookingData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                <BookingModal bookingData={bookingData}>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Calendar className="h-5 w-5" />
                    Book a Session
                  </div>
                </BookingModal>
              </div>
            )}
          </div>
        </div>

        {/* Decorative curve or divider could go here */}
      </div>

      <div className="container mx-auto -mt-12 max-w-5xl px-4 pb-20 relative z-20">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            {profile.bio && (
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold">About Me</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground text-lg">
                    {profile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground">Education</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">School</div>
                    <div className="text-muted-foreground">{profile.school}</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Major</div>
                    <div className="text-muted-foreground">{profile.major}</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Year</div>
                    <div className="text-muted-foreground">
                      {profile.schoolYear} (Class of {profile.graduationYear})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)

  if (!profile) return { title: 'Profile Not Found' }

  return {
    title: `${profile.name} - ${profile.major} at ${profile.school} | Discuno`,
    description: profile.bio?.substring(0, 160) ?? `Book a mentoring session with ${profile.name}`,
  }
}
