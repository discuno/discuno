'use client'

import { useQuery } from '@tanstack/react-query'
import { getBookings } from '~/app/(app)/(mentor)/settings/actions'
import { BookingList } from '~/app/(app)/(mentor)/settings/bookings/components/BookingList'
import { Spinner } from '~/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import type { getMentorBookings } from '~/server/queries/bookings'

export type Booking = Awaited<ReturnType<typeof getMentorBookings>>[number]

export const BookingsPage = () => {
  const {
    data: bookings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const result = await getBookings()
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch bookings')
      }
      return result.data ?? []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const now = new Date()
  const upcomingBookings = bookings?.filter(booking => new Date(booking.startTime) >= now) ?? []
  const pastBookings = bookings?.filter(booking => new Date(booking.startTime) < now) ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold">Bookings</h1>
      <p className="text-muted-foreground">
        See upcoming and past events booked through your event type links.
      </p>
      <Tabs defaultValue="upcoming" className="mt-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : error ? (
            <p className="text-destructive">{error.message}</p>
          ) : (
            <BookingList bookings={upcomingBookings} />
          )}
        </TabsContent>
        <TabsContent value="past">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : error ? (
            <p className="text-destructive">{error.message}</p>
          ) : (
            <BookingList bookings={pastBookings} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
