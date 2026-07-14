'use client'

import {
  BookingModal,
  type BookingData,
} from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'

interface BookingButtonProps {
  bookingData: BookingData
  children: React.ReactNode
  className?: string
}

export const BookingButton = ({ bookingData, children, className }: BookingButtonProps) => (
  <BookingModal bookingData={bookingData} className={className}>
    {children}
  </BookingModal>
)
