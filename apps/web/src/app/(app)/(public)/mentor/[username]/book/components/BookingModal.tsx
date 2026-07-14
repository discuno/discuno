'use client'

import Image from 'next/image'
import { Suspense, useState } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { BookingEmbed } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { BookingEmbedSkeleton } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbedSkeleton'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

export interface BookingData {
  userId: string
  username: string
  calcomUsername: string
  name: string
  image: string
  bio: string
  school: string
  major: string
  eventTypes: EventType[]
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
        <DialogContent className="h-[min(820px,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[920px] gap-0 overflow-hidden p-0 focus:outline-none sm:h-[min(820px,calc(100dvh-3rem))] sm:w-[calc(100vw-3rem)] sm:rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Book a session with {bookingData.name}</DialogTitle>
            <DialogDescription>Choose a session, date, and available time.</DialogDescription>
          </DialogHeader>

          <div className="flex h-full min-h-0 flex-col">
            <div className="bg-muted/30 hidden shrink-0 items-center gap-3 border-b px-6 py-4 md:flex">
              {bookingData.image && (
                <Image
                  width={48}
                  height={48}
                  src={bookingData.image}
                  alt=""
                  className="h-12 w-12 rounded-full border object-cover"
                />
              )}
              <div className="min-w-0">
                <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
                  Book a session with {bookingData.name}
                </h2>
                <p className="text-muted-foreground mt-0.5 truncate text-sm">
                  {[bookingData.school, bookingData.major].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div className="bg-background flex-1 overflow-x-hidden overflow-y-auto [padding-bottom:env(safe-area-inset-bottom)]">
              <Suspense fallback={<BookingEmbedSkeleton />}>
                <BookingEmbed bookingData={bookingData} />
              </Suspense>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
