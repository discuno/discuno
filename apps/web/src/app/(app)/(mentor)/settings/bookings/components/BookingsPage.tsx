'use client'

import { useQuery } from '@tanstack/react-query'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getBookings } from '~/app/(app)/(mentor)/settings/actions'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Item, ItemActions, ItemContent, ItemGroup } from '~/components/ui/item'
import { Skeleton } from '~/components/ui/skeleton'
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
  <span className="text-muted-foreground min-w-4 text-center text-xs tabular-nums">{value}</span>
)

const BookingsLoading = () => (
  <div aria-live="polite" aria-busy="true">
    <span className="sr-only">Loading sessions…</span>
    <ItemGroup className="border-border divide-border gap-0 divide-y border-y" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <Item key={index} className="items-start rounded-none border-0 px-0 py-5 sm:flex-nowrap">
          <ItemContent className="gap-3">
            <Skeleton className="h-5 w-full max-w-xs" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </ItemContent>
          <ItemActions className="basis-full sm:basis-auto sm:self-center">
            <Skeleton className="h-9 w-24" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  </div>
)

export const BookingsPage = () => {
  const timeZone = useBrowserTimeZone()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const result = await getBookings()
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch sessions')
      return result.data ?? []
    },
    staleTime: 1000 * 60,
  })

  const groups = groupBookings(data ?? [], new Date())

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
            Sessions
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            Prepare for upcoming conversations and review past sessions.
          </p>
        </div>
        <p className="text-muted-foreground text-xs sm:pb-1">
          Times shown in <TimeZoneLabel timeZone={timeZone} />
        </p>
      </header>

      {isLoading ? (
        <BookingsLoading />
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Sessions could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
              )}
              {isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="upcoming" className="gap-4">
          <TabsList
            variant="line"
            aria-label="Session status"
            className="max-w-full overflow-x-auto"
          >
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
              emptyDescription="A session will appear here when a student schedules one."
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
              emptyDescription="Cancelled or rejected sessions will remain here for your records."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
