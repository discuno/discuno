'use client'

import { Booker } from '@discuno/atoms'
import { useState } from 'react'
import { Button } from '~/components/ui/button'

interface CalEmbedButtonProps {
  username: string
  eventSlug?: string
  children: React.ReactNode
}

export const CalEmbedButton = ({ username, eventSlug = '30min', children }: CalEmbedButtonProps) => {
  const [showBooker, setShowBooker] = useState(false)

  if (showBooker) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 backdrop-blur-sm">
        <div className="bg-background fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Book a Meeting</h2>
            <Button variant="outline" size="sm" onClick={() => setShowBooker(false)}>
              Close
            </Button>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <Booker
              username={username}
              eventTypeSlug={eventSlug}
              layout="desktop"
              onBookingComplete={booking => {
                console.log('Booking successful:', booking)
                setShowBooker(false)
              }}
              onError={error => {
                console.error('Booking failed:', error)
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button onClick={() => setShowBooker(true)} className="w-full">
      {children}
    </Button>
  )
}
