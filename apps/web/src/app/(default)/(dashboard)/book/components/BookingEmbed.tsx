'use client'

import { Booker } from '@calcom/atoms'

interface BookingEmbedProps {
  username: string
  eventSlug?: string
  hideEventTypeDetails?: boolean
}

export const BookingEmbed = ({ username, eventSlug = '30min' }: BookingEmbedProps) => {
  return (
    <div className="bg-background h-full min-h-[600px] w-full rounded-lg border">
      <Booker
        username={username}
        eventSlug={eventSlug}
        onCreateBookingSuccess={(booking: any) => {
          console.log('Booking successful:', booking)
          // Could add analytics tracking or redirect logic here
        }}
        onCreateBookingError={(error: any) => {
          console.error('Booking failed:', error)
          // Could show toast notification or redirect to error page
        }}
      />
    </div>
  )
}
