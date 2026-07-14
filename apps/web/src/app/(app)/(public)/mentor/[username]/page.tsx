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
    <div className="bg-background min-h-screen">
      {/* Hero Header */}
      <div className="bg-muted/20 relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-32">
        <div className="from-primary/5 to-primary/5 absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with Glow */}
            <div className="relative mb-8">
              <div className="bg-primary/20 absolute -inset-4 rounded-full blur-2xl" />
              <Avatar className="border-background relative z-10 h-40 w-40 border-8 shadow-2xl">
                <AvatarImage src={profile.image ?? ''} alt={profile.name ?? ''} />
                <AvatarFallback className="text-4xl">
                  {profile.name?.charAt(0) ?? 'M'}
                </AvatarFallback>
              </Avatar>
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {profile.name}
            </h1>

            <div className="mb-8 flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="px-4 py-1.5 text-base">
                {profile.school}
              </Badge>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 px-4 py-1.5 text-base"
              >
                {profile.major}
              </Badge>
            </div>

            {hasBooking && bookingData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards duration-700">
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

      <div className="relative z-20 container mx-auto -mt-12 max-w-5xl px-4 pb-20">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-8 md:col-span-2">
            {profile.bio && (
              <div className="bg-card rounded-2xl border p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold">About Me</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-6 shadow-sm">
              <h3 className="text-foreground mb-4 font-semibold">Education</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">School</div>
                    <div className="text-muted-foreground">{profile.school}</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Major</div>
                    <div className="text-muted-foreground">{profile.major}</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
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
