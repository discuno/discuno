interface BookingPageProps {
  params: Promise<{
    username: string
  }>
  searchParams: Promise<{
    eventType?: string
  }>
}

const BookingPage = async () => {
  return <p>Under Construction</p>
}

export default BookingPage

export async function generateMetadata({ params }: BookingPageProps) {
  const { username } = await params

  return {
    title: `Book a Session with ${username} | Discuno`,
    description: `Schedule a mentoring session with ${username} on Discuno`,
  }
}
