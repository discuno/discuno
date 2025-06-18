import { Calendar } from 'lucide-react'
import { Suspense } from 'react'
import { BookingButton } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingButton'
import { BookingEmbed } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbedSkeleton'
import { BookingModal } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingModal'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getFullProfile } from '~/server/queries'

interface BookingInterfaceProps {
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

export const BookingInterface = async ({
  children,
  variant = 'button',
  className,
}: BookingInterfaceProps) => {
  // Server-side data fetching
  const profile = await getFullProfile()

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
