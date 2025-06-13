'use client'

import { BookingEmbedSkeleton } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbedSkeleton'
import { Suspense, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Badge } from '~/components/ui/badge'
import { BookingEmbed } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingEmbed'
import Image from 'next/image'

interface BookingData {
  username: string
  name: string
  image: string
  bio: string
  school: string
  major: string
}

interface BookingModalProps {
  bookingData: BookingData
  children: React.ReactNode
  className?: string
}

export const BookingModal = ({ bookingData, children, className }: BookingModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={className} size="lg">
        {children}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[95vh] max-w-6xl overflow-hidden p-0">
          {/* Enhanced Header */}
          <div className="from-primary/10 via-primary/5 relative border-b bg-gradient-to-r to-transparent p-6">
            <DialogHeader>
              <div className="flex items-start gap-4">
                {bookingData.image && (
                  <Image
                    src={bookingData.image}
                    alt={bookingData.name}
                    className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <DialogTitle className="mb-2 text-2xl font-bold">Schedule with {bookingData.name}</DialogTitle>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {bookingData.school}
                    </Badge>
                    <Badge variant="outline">{bookingData.major}</Badge>
                  </div>
                  {bookingData.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed">{bookingData.bio}</p>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Booking Interface */}
          <div className="bg-background flex-1 overflow-hidden">
            <Suspense fallback={<BookingEmbedSkeleton />}>
              <BookingEmbed username={bookingData.username} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
