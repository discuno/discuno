import { Suspense } from 'react'
import { getFullProfile } from '~/server/queries'
import { BookingModal } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingModal'
import { BookingButton } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingButton'
import { Calendar } from 'lucide-react'
import { BookingEmbed } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbedSkeleton'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'

interface BookingInterfaceProps {
  userId: string
  children?: React.ReactNode
  variant?: 'button' | 'modal' | 'inline'
  className?: string
}

interface BookingData {
  username: string
  name: string
  image: string
  bio: string
  school: string
  major: string
}

export const BookingInterface = async ({ userId, children, variant = 'button', className }: BookingInterfaceProps) => {
  // Server-side data fetching
  const profile = await getFullProfile(userId)

  if (!profile) {
    return null
  }

  const bookingData: BookingData = {
    username: profile.name?.split(' ')[0] ?? 'fake-username',
    name: profile.name ?? 'Mentor',
    image: profile.image ?? '',
    bio: profile.bio ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
  }

  return (
    <CalProviderWrapper>
      <Suspense fallback={<BookingEmbedSkeleton />}>
        {variant === 'button' && (
          <BookingButton bookingData={bookingData} className={className}>
            {children ?? (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </>
            )}
          </BookingButton>
        )}

        {variant === 'modal' && (
          <BookingModal bookingData={bookingData} className={className}>
            {children ?? (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </>
            )}
          </BookingModal>
        )}

        {variant === 'inline' && (
          <div className={className}>
            <BookingInline bookingData={bookingData} />
          </div>
        )}
      </Suspense>
    </CalProviderWrapper>
  )
}

// Inline booking component for full-page experiences
const BookingInline = ({ bookingData }: { bookingData: BookingData }) => {
  return (
    <div className="w-full">
      <Suspense fallback={<BookingEmbedSkeleton />}>
        <BookingEmbed username={bookingData.username} />
      </Suspense>
    </div>
  )
}
