'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Ban } from 'lucide-react'
import { toast } from 'sonner'
import { cancelBooking } from '~/app/(app)/(mentor)/settings/actions'
import { type Booking } from '~/app/(app)/(mentor)/settings/bookings/components/BookingsPage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'

type BookingListItemProps = {
  booking: Booking
}

export const BookingListItem = ({ booking }: BookingListItemProps) => {
  const isCancelled = booking.status === 'CANCELLED'
  const startDate = new Date(booking.startTime)
  const endDate = new Date(booking.endTime)
  const queryClient = useQueryClient()

  const cancelBookingMutation = useMutation({
    mutationFn: () =>
      cancelBooking({
        bookingUid: booking.calcomUid,
        cancellationReason: 'Cancelled by mentor',
      }),
    onSuccess: () => {
      toast.success('Booking cancelled successfully')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  return (
    <div className="border-b py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className={`text-muted-foreground text-sm ${isCancelled ? 'line-through' : ''}`}>
            {format(startDate, 'EEE, d MMM')}
          </div>
          <div className={`font-medium ${isCancelled ? 'line-through' : ''}`}>
            {format(startDate, 'p')} - {format(endDate, 'p')}
          </div>
        </div>
        <div className="flex-1">
          <div className={`font-semibold ${isCancelled ? 'line-through' : ''}`}>
            {booking.title}
          </div>
          <div className="text-muted-foreground text-sm">{booking.attendeeName}</div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          {isCancelled ? (
            <span className="text-muted-foreground font-medium">Cancelled</span>
          ) : (
            <>
              {booking.meetingUrl && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Join Video Call
                </a>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive-ghost"
                    size="sm"
                    disabled={cancelBookingMutation.isPending}
                  >
                    <Ban className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the meeting and may result in a penalty to your reputation.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => cancelBookingMutation.mutate()}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
