import { BookingContent } from '../components/BookingContent'
import { BookingShell } from '../components/BookingShell'

interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
  }>
}

const BookingPage = async ({ params, searchParams }: BookingPageProps) => {
  const { username } = await params
  const { eventType } = await searchParams

  return (
    <BookingShell username={username}>
      <BookingContent username={username} eventType={eventType} />
    </BookingShell>
  )
}

export default BookingPage

export async function generateMetadata({ params }: BookingPageProps) {
  const { username } = await params

  return {
    title: `Book a Session with ${username} | Discuno`,
    description: `Schedule a mentoring session with ${username} on Discuno`,
  }
}
