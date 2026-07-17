'use client'

import { useQuery } from '@tanstack/react-query'
import { CircleAlert } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getBookings } from '~/app/(app)/(mentor)/settings/actions'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { groupBookings } from './booking-groups'
import { BookingList } from './BookingList'

const subscribeToTimeZone = () => () => undefined
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const getServerTimeZone = () => 'UTC'

const useBrowserTimeZone = () =>
  useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, getServerTimeZone)

const TimeZoneLabel = ({ timeZone }: { timeZone: string }) => (
  <span className="whitespace-nowrap">{timeZone.replaceAll('_', ' ')}</span>
)

const Count = ({ value }: { value: number }) => (
  <Badge variant="secondary" className="min-w-5 justify-center px-1.5 py-0 tabular-nums">
    {value}
  </Badge>
)

export const BookingsPage = () => {
  const timeZone = useBrowserTimeZone()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const result = await getBookings()
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch bookings')
      return result.data ?? []
    },
    staleTime: 1000 * 60,
  })

  const groups = groupBookings(data ?? [], new Date())

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bookings</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
            Prepare for upcoming conversations and keep a clear record of what happened.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          Times shown in <TimeZoneLabel timeZone={timeZone} />
        </p>
      </header>

      {isLoading ? (
        <div
          className="text-muted-foreground flex min-h-48 items-center justify-center gap-2"
          role="status"
        >
          <Spinner />
          <span>Loading bookings…</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Bookings could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="upcoming" className="gap-5">
          <TabsList aria-label="Booking status" className="max-w-full overflow-x-auto">
            <TabsTrigger value="upcoming">
              Upcoming
              <Count value={groups.upcoming.length} />
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <Count value={groups.completed.length} />
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled
              <Count value={groups.cancelled.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <BookingList
              bookings={groups.upcoming}
              timeZone={timeZone}
              emptyTitle="No upcoming sessions"
              emptyDescription="New bookings will appear here as soon as a student schedules one."
            />
          </TabsContent>
          <TabsContent value="completed">
            <BookingList
              bookings={groups.completed}
              timeZone={timeZone}
              emptyTitle="No completed sessions yet"
              emptyDescription="Finished sessions and no-show records will appear here."
            />
          </TabsContent>
          <TabsContent value="cancelled">
            <BookingList
              bookings={groups.cancelled}
              timeZone={timeZone}
              emptyTitle="No cancelled sessions"
              emptyDescription="Cancelled or rejected bookings will remain here for your records."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
