import { Calendar } from 'lucide-react'
import { Suspense } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { BookingButton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingButton'
import { BookingEmbed } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'

interface BookingInterfaceProps {
  children?: React.ReactNode
  variant?: 'button' | 'modal' | 'inline'
  className?: string
  bookingData: BookingData
  initialNowIso?: string
}

export type BookingData = {
  userId: string
  username: string // Discuno username for routing
  calcomUsername: string // Cal.com username for API calls
  name: string
  image: string
  bio: string
  school: string
  major: string
  eventTypes: EventType[]
}

export const BookingInterface = ({
  children,
  variant = 'button',
  className,
  bookingData,
  initialNowIso,
}: BookingInterfaceProps) => {
  return (
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
          <BookingInline bookingData={bookingData} initialNowIso={initialNowIso} />
        </div>
      )}
    </Suspense>
  )
}

// Inline booking component for full-page experiences
const BookingInline = ({
  bookingData,
  initialNowIso,
}: {
  bookingData: BookingData
  initialNowIso?: string
}) => {
  return (
    <div className="w-full">
      <Suspense fallback={<BookingEmbedSkeleton />}>
        <BookingEmbed bookingData={bookingData} isFullPage={true} initialNowIso={initialNowIso} />
      </Suspense>
    </div>
  )
}
