'use client'

import { Booker } from '@discuno/atoms'
import { toast } from 'sonner'

interface BookerShowcaseProps {
  className?: string
}

export function BookerShowcase({ className: _className }: BookerShowcaseProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Desktop Layout */}
      <div>
        <h3 className="mb-3 font-semibold">Desktop Layout</h3>
        <div className="bg-card rounded-lg border p-4">
          <Booker
            username="demo-user"
            eventTypeSlug="30min"
            layout="desktop"
            onBookingComplete={booking => {
              console.log('Desktop booking:', booking)
              toast.success('Booking completed successfully!')
            }}
            onError={error => {
              console.error('Desktop booking error:', error)
              toast.error('Booking failed. Please try again.')
            }}
            className="min-h-[400px]"
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div>
        <h3 className="mb-3 font-semibold">Mobile Layout</h3>
        <div className="bg-card rounded-lg border p-4">
          <Booker
            username="demo-user"
            eventTypeSlug="15min"
            layout="mobile"
            onBookingComplete={booking => {
              console.log('Mobile booking:', booking)
              toast.success('Mobile booking completed!')
            }}
            onError={error => {
              console.error('Mobile booking error:', error)
              toast.error('Mobile booking failed. Please try again.')
            }}
            className="min-h-[400px]"
          />
        </div>
      </div>
    </div>
  )
}
