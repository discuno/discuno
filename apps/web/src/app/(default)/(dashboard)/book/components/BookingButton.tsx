'use client'

import Image from 'next/image'
import { Suspense, useState } from 'react'
import { BookingEmbed } from '~/app/(default)/(dashboard)/book/components/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(default)/(dashboard)/book/components/BookingEmbedSkeleton'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { CalcomProvider } from '~/lib/providers/CalProvider'

interface BookingData {
  calcomUsername: string
  name: string
  image: string
  bio: string
  school: string
  major: string
}

interface BookingButtonProps {
  bookingData: BookingData
  children: React.ReactNode
  className?: string
}

export const BookingButton = ({ bookingData, children, className }: BookingButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={className}>
        {children}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold">
              Schedule with {bookingData.name}
            </DialogTitle>
            <div className="mt-2 flex items-center gap-3">
              {bookingData.image && (
                <Image
                  src={bookingData.image}
                  alt={bookingData.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-muted-foreground text-sm">
                  {bookingData.school} • {bookingData.major}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<BookingEmbedSkeleton />}>
              <CalcomProvider>
                <BookingEmbed username={bookingData.calcomUsername} />
              </CalcomProvider>
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
