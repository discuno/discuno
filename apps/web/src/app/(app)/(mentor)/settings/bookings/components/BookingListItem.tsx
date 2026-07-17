'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, CalendarClock, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cancelBooking } from '~/app/(app)/(mentor)/settings/actions'
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
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ButtonGroup } from '~/components/ui/button-group'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '~/components/ui/item'
import type { Booking } from './booking-types'

type BookingListItemProps = {
  booking: Booking
  timeZone: string
}

const statusPresentation: Record<Booking['status'], { label: string; className: string }> = {
  ACCEPTED: {
    label: 'Accepted',
    className: 'border-success/20 bg-success/10 text-success',
  },
  PENDING: {
    label: 'Pending',
    className: 'border-warning/25 bg-warning/10 text-warning-foreground',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border-success/20 bg-success/10 text-success',
  },
  NO_SHOW: {
    label: 'No-show',
    className: 'border-warning/25 bg-warning/10 text-warning-foreground',
  },
}

const formatDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date)

const formatTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date)

export const BookingListItem = ({ booking, timeZone }: BookingListItemProps) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const startDate = new Date(booking.startTime)
  const endDate = new Date(booking.endTime)
  const now = new Date()
  const activeStatus = booking.status === 'ACCEPTED' || booking.status === 'PENDING'
  const hasEnded = endDate <= now
  const canJoin = booking.status === 'ACCEPTED' && !hasEnded && Boolean(booking.meetingUrl)
  const canCancel = activeStatus && !hasEnded
  const status = statusPresentation[booking.status]

  const cancelBookingMutation = useMutation({
    mutationFn: async () => {
      const result = await cancelBooking({
        bookingUid: booking.calcomUid,
        cancellationReason: 'Cancelled by mentor',
      })

      if (!result.success) {
        throw new Error(result.error ?? 'The session could not be cancelled.')
      }

      return result
    },
    onSuccess: () => {
      setCancelDialogOpen(false)
      toast.success('Session cancelled')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: error => {
      toast.error("Couldn't cancel the session", { description: error.message })
    },
  })

  return (
    <Item role="listitem" variant="outline" className="items-start sm:flex-nowrap">
      <ItemMedia
        variant="icon"
        className="bg-muted text-muted-foreground hidden size-10 rounded-md sm:flex"
      >
        <CalendarClock aria-hidden="true" />
      </ItemMedia>

      <ItemContent className="min-w-0 gap-2">
        <ItemHeader className="items-start">
          <ItemTitle className="line-clamp-none text-base">{booking.title}</ItemTitle>
          <Badge
            variant="outline"
            className={status.className}
            aria-label={`Booking status: ${status.label}`}
          >
            {status.label}
          </Badge>
        </ItemHeader>
        <ItemDescription className="line-clamp-none">
          Session with <span className="text-foreground font-medium">{booking.attendeeName}</span>
        </ItemDescription>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <time dateTime={startDate.toISOString()}>
            {formatDate(startDate, timeZone)} · {formatTime(startDate, timeZone)}–
            {formatTime(endDate, timeZone)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{timeZone.replaceAll('_', ' ')}</span>
        </div>
      </ItemContent>

      {(canJoin || canCancel) && (
        <ItemActions className="basis-full sm:basis-auto sm:self-center">
          <ButtonGroup className="w-full sm:w-fit">
            {canJoin && booking.meetingUrl && (
              <Button
                render={<a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Join
                <ExternalLink aria-hidden="true" data-icon="inline-end" />
              </Button>
            )}
            {canCancel && (
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={cancelBookingMutation.isPending}
                    />
                  }
                >
                  <Ban aria-hidden="true" data-icon="inline-start" />
                  Cancel
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cancelling as the mentor ends this session for everyone. If it was paid, the
                      student receives a full refund. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelBookingMutation.isPending}>
                      Keep session
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={cancelBookingMutation.isPending}
                      onClick={() => cancelBookingMutation.mutate()}
                    >
                      {cancelBookingMutation.isPending ? 'Cancelling…' : 'Cancel session'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </ButtonGroup>
        </ItemActions>
      )}
    </Item>
  )
}
