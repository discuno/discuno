import { Suspense } from 'react'
import { BookingEmbed } from './BookingEmbed'
import { BookingEmbedSkeleton } from './BookingEmbedSkeleton'
import type { BookingData } from '../types'

interface BookingInterfaceProps {
  bookingData: BookingData
  initialNowIso?: string
  initialEventTypeId?: number
}

export function BookingInterface({
  bookingData,
  initialNowIso,
  initialEventTypeId,
}: BookingInterfaceProps) {
  return (
    <Suspense fallback={<BookingEmbedSkeleton />}>
      <BookingEmbed
        bookingData={bookingData}
        initialNowIso={initialNowIso}
        initialEventTypeId={initialEventTypeId}
      />
    </Suspense>
  )
}
