import { notFound } from 'next/navigation'
import { getPublicProfileByUsername } from '~/server/queries/profiles'
import { BookingInterface } from './components/BookingInterface'

interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
    bookingState?: string
  }>
}

const BookingPage = async ({ params }: BookingPageProps) => {
  const { username } = await params

  const profile = await getPublicProfileByUsername(username)
  if (!profile?.calcomUsername) notFound()

  const bookingData = {
    userId: profile.userId,
    calcomUsername: profile.calcomUsername,
    name: profile.name ?? 'Mentor',
    image: profile.image ?? '',
    bio: profile.bio ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <BookingInterface bookingData={bookingData} variant="inline" />
    </div>
  )
}

export default BookingPage

export async function generateMetadata({ params }: BookingPageProps) {
  const { username } = await params
  const profile = await getPublicProfileByUsername(username)

  return {
    title: `Book ${profile?.name ?? username} | Discuno`,
    description: `Schedule a mentoring session with ${profile?.name ?? username}`,
  }
}
