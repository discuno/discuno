'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, ExternalLink } from 'lucide-react'
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
import { Badge, type BadgeProps } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '~/components/ui/item'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'
import type { Booking } from './booking-types'

type BookingListItemProps = {
  booking: Booking
  timeZone: string
  headingLevel?: 2 | 3
}

const statusPresentation: Record<
  Booking['status'],
  { label: string; variant: BadgeProps['variant'] }
> = {
  ACCEPTED: {
    label: 'Accepted',
    variant: 'success',
  },
  PENDING: {
    label: 'Pending',
    variant: 'warning',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
  },
  NO_SHOW: {
    label: 'No-show',
    variant: 'warning',
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

export const BookingListItem = ({ booking, timeZone, headingLevel = 2 }: BookingListItemProps) => {
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
    <Item role="listitem" className="items-start rounded-none border-0 px-0 py-5 sm:flex-nowrap">
      <ItemContent className="min-w-0 gap-2">
        <ItemHeader className="items-start">
          <ItemTitle role="heading" aria-level={headingLevel} className="line-clamp-none text-base">
            {booking.title}
          </ItemTitle>
          <Badge variant={status.variant} aria-label={`Booking status: ${status.label}`}>
            {status.label}
          </Badge>
        </ItemHeader>
        <ItemDescription className="line-clamp-none">
          Session with <span className="text-foreground font-medium">{booking.attendeeName}</span>
        </ItemDescription>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <time dateTime={startDate.toISOString()}>
            {formatDate(startDate, timeZone)} from {formatTime(startDate, timeZone)} to{' '}
            {formatTime(endDate, timeZone)}
          </time>
          <span>
            <span className="sr-only">Timezone: </span>
            {timeZone.replaceAll('_', ' ')}
          </span>
        </div>
      </ItemContent>

      {(canJoin || canCancel) && (
        <ItemActions className="basis-full gap-2 sm:basis-auto sm:self-center">
          {canJoin && booking.meetingUrl && (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'flex-1 sm:flex-none'
              )}
            >
              Join
              <ExternalLink aria-hidden="true" data-icon="inline-end" />
            </a>
          )}
          {canCancel && (
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
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
                    {cancelBookingMutation.isPending && <Spinner data-icon="inline-start" />}
                    {cancelBookingMutation.isPending ? 'Cancelling…' : 'Cancel session'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </ItemActions>
      )}
    </Item>
  )
}
