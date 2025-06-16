'use client'

import { Booker } from '@discuno/atoms'

interface BookingEmbedProps {
  username: string
  eventSlug?: string
  hideEventTypeDetails?: boolean
  layout?: 'mobile' | 'desktop' | 'mobile_embed'
  eventTypeId?: number
}

export const BookingEmbed = ({
  username,
  eventSlug = '30min',
  layout = 'desktop',
  eventTypeId,
}: BookingEmbedProps) => {
  return (
    <div className="bg-background h-full min-h-[600px] w-full rounded-lg border">
      <Booker
        username={username}
        eventTypeSlug={eventSlug}
        eventTypeId={eventTypeId}
        layout={layout}
        onBookingComplete={booking => {
          console.log('Booking successful:', booking)
          // Could add analytics tracking or redirect logic here
        }}
        onError={error => {
          console.error('Booking failed:', error)
          // Could show toast notification or redirect to error page
        }}
        className="h-full w-full"
      />
    </div>
  )
}
