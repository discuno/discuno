import { Calendar } from 'lucide-react'
import { Suspense } from 'react'
import { BookingButton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingButton'
import { BookingEmbed } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'

interface BookingInterfaceProps {
  children?: React.ReactNode
  variant?: 'button' | 'modal' | 'inline'
  className?: string
  bookingData: BookingData
}

export type BookingData = {
  userId: string
  calcomUsername: string
  name: string
  image: string
  bio: string
  school: string
  major: string
}

export const BookingInterface = ({
  children,
  variant = 'button',
  className,
  bookingData,
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
          <BookingInline bookingData={bookingData} />
        </div>
      )}
    </Suspense>
  )
}

// Inline booking component for full-page experiences
const BookingInline = ({ bookingData }: { bookingData: BookingData }) => {
  return (
    <div className="w-full">
      <Suspense fallback={<BookingEmbedSkeleton />}>
        <BookingEmbed bookingData={bookingData} />
      </Suspense>
    </div>
  )
}
