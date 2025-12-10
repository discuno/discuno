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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Hero Section */}
      <div className="from-primary/20 to-primary/5 mb-8 rounded-xl bg-linear-to-br p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <Avatar className="border-background h-32 w-32 border-4 shadow-xl">
            <AvatarImage src={profile.image ?? ''} alt={profile.name ?? ''} />
            <AvatarFallback className="text-3xl">{profile.name?.charAt(0) ?? 'M'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <h1 className="mb-2 text-3xl font-bold">{profile.name}</h1>
            <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
              <Badge variant="secondary">{profile.schoolYear}</Badge>
              <Badge variant="secondary">Class of {profile.graduationYear}</Badge>
            </div>

            <div className="text-muted-foreground space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <School className="h-4 w-4" />
                <span>{profile.school}</span>
              </div>
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <GraduationCap className="h-4 w-4" />
                <span>{profile.major}</span>
              </div>
            </div>
          </div>

          {bookingData && (
            <BookingModal bookingData={bookingData}>
              <Calendar className="mr-2 h-5 w-5" />
              Book a Session
            </BookingModal>
          )}
        </div>
      </div>

      {/* About Section */}
      {profile.bio && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">About</h2>
          <div className="bg-muted/50 rounded-xl p-6">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        </div>
      )}
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
