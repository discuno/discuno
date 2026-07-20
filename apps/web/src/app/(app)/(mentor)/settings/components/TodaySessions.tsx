'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleAlert, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { getBookings } from '~/app/(app)/(mentor)/settings/actions'
import { BookingListItem } from '~/app/(app)/(mentor)/settings/bookings/components/BookingListItem'
import { groupBookings } from '~/app/(app)/(mentor)/settings/bookings/components/booking-groups'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button, buttonVariants } from '~/components/ui/button'
import { Item, ItemContent, ItemGroup } from '~/components/ui/item'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

const subscribeToTimeZone = () => () => undefined
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const getServerTimeZone = () => 'UTC'

function TodaySessionsLoading() {
  return (
    <ItemGroup className="border-border divide-border gap-0 divide-y border-y" aria-hidden="true">
      {[0, 1].map(index => (
        <Item key={index} className="rounded-none border-0 px-0 py-5">
          <ItemContent className="gap-3">
            <Skeleton className="h-5 w-full max-w-xs" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function TodaySessions() {
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, getServerTimeZone)
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const result = await getBookings()
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch sessions')
      return result.data ?? []
    },
    staleTime: 60_000,
  })
  const upcomingSessions = groupBookings(data ?? [], new Date()).upcoming.slice(0, 3)

  return (
    <section aria-labelledby="today-sessions-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="today-sessions-heading" className="text-lg font-semibold">
            Upcoming sessions
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Times shown in {timeZone.replaceAll('_', ' ')}.
          </p>
        </div>
        <Link
          href="/settings/bookings"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-mr-3')}
        >
          View all sessions
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4" aria-live="polite" aria-busy={isLoading || isFetching}>
        {isLoading ? (
          <TodaySessionsLoading />
        ) : error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Upcoming sessions could not be loaded</AlertTitle>
            <AlertDescription>
              <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {isFetching ? 'Trying again…' : 'Try again'}
              </Button>
            </AlertDescription>
          </Alert>
        ) : upcomingSessions.length > 0 ? (
          <ItemGroup className="border-border divide-border gap-0 divide-y border-y">
            {upcomingSessions.map(booking => (
              <BookingListItem
                key={booking.calcomUid}
                booking={booking}
                timeZone={timeZone}
                headingLevel={3}
              />
            ))}
          </ItemGroup>
        ) : (
          <div className="border-border border-y py-6">
            <p className="font-medium">No upcoming sessions</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              New bookings will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
