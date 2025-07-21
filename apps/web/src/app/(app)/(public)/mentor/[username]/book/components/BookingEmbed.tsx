'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, Clock, DollarSign, Timer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  createBooking as createBookingAction,
  fetchEventTypes as fetchEventTypesAction,
  fetchAvailableSlots as fetchSlotsAction,
  type EventType,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { BadRequestError, ExternalApiError } from '~/lib/errors'

interface BookingEmbedProps {
  username: string
  eventSlug?: string
  onCreateBookingSuccess?: (booking: any) => void
  onCreateBookingError?: (error: any) => void
}

interface BookingFormData {
  name: string
  email: string
}

export const BookingEmbed = ({
  username,
  onCreateBookingSuccess,
  onCreateBookingError,
}: BookingEmbedProps) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'calendar' | 'booking'>('calendar')
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
  })

  // Fetch event types
  const {
    data: eventTypes = [],
    isPending: eventTypesLoading,
    error: eventTypesError,
  } = useQuery({
    queryKey: ['event-types', username],
    queryFn: () =>
      // TODO: return to norm
      fetchEventTypesAction(username).then(data => {
        console.log('Fetched event types:', data)
        return data
      }),
    staleTime: 0,
  })

  // Use the provided eventSlug or the selected event type
  const currentEventSlug = selectedEventType?.slug

  const {
    data: availableSlots = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['available-slots', username, currentEventSlug, selectedDate],
    queryFn: () => {
      if (!currentEventSlug) throw new BadRequestError('No event type selected')
      return fetchSlotsAction(username, currentEventSlug, selectedDate, timeZone)
    },
    staleTime: 1000 * 30,
    enabled: currentStep === 'calendar' && !!currentEventSlug,
  })

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (bookingData: {
      username: string
      eventSlug: string
      startTime: string
      attendee: {
        name: string
        email: string
        timeZone: string
      }
    }) => createBookingAction(bookingData),
    onSuccess: bookingUid => {
      const booking = {
        id: bookingUid,
        date: selectedDate,
        time: selectedTimeSlot,
        attendee: formData,
        eventType: selectedEventType,
      }
      toast.success('Booking confirmed!')
      onCreateBookingSuccess?.(booking)

      // Reset form
      setCurrentStep('calendar')
      setSelectedEventType(null)
      setSelectedTimeSlot(null)
      setFormData({ name: '', email: '' })
    },
    onError: error => {
      console.error('Booking failed:', error)
      toast.error('Failed to create booking')
      onCreateBookingError?.(error)
    },
  })

  if (error) {
    throw new ExternalApiError(error.message)
  }

  const handleBooking = async () => {
    if (!selectedTimeSlot || !currentEventSlug) return

    // Combine selected date and time into ISO string
    const timeSlot = selectedTimeSlot
    const [hours, minutes] = timeSlot.split(':')
    const startTime = new Date(selectedDate)
    startTime.setHours(parseInt(hours ?? '0'), parseInt(minutes ?? '0'), 0, 0)

    createBookingMutation.mutate({
      username,
      eventSlug: currentEventSlug,
      startTime: startTime.toISOString(),
      attendee: {
        name: formData.name,
        email: formData.email,
        timeZone: timeZone,
      },
    })
  }

  if (eventTypesLoading) {
    return <BookingEmbedSkeleton />
  }

  if (eventTypesError) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Booking Unavailable</h3>
          <p className="text-muted-foreground">
            Failed to load booking calendar. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background h-full min-h-[600px] w-full">
      {currentStep === 'calendar' ? (
        <div className="p-6">
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Schedule a Session</h2>
            <p className="text-muted-foreground text-sm">
              Choose your session type, then select a date and time
            </p>
          </div>

          {/* Event Type Selection */}
          <div className="mb-6">
            <Label className="mb-2 block text-sm font-medium">Session Type</Label>
            <Select
              value={selectedEventType?.id.toString() ?? ''}
              onValueChange={value => {
                const eventType = eventTypes.find(et => et.id.toString() === value)
                setSelectedEventType(eventType ?? null)
                setSelectedTimeSlot(null) // Reset time selection when event type changes
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a session type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(eventType => (
                  <SelectItem key={eventType.id} value={eventType.id.toString()}>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        <span>{eventType.length} min</span>
                      </div>
                      {eventType.price && (
                        <div className="ml-4 flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium text-green-600">
                            {eventType.price} {eventType.currency ?? 'USD'}
                          </span>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEventType && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Calendar */}
              <div>
                <h3 className="mb-4 text-lg font-medium">Select Date</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => {
                    if (date) {
                      setSelectedDate(date)
                      setSelectedTimeSlot(null)
                    }
                  }}
                  disabled={date => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {/* Time Slots */}
              <div>
                <h3 className="mb-4 text-lg font-medium">
                  Available Times - {format(selectedDate, 'EEEE, MMMM d')}
                </h3>

                {isFetching ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto">
                    {availableSlots.length === 0 ? (
                      <div className="col-span-2 py-8 text-center">
                        <Clock className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          No available times for this date
                        </p>
                      </div>
                    ) : (
                      availableSlots.map(slot => (
                        <Button
                          key={slot.time}
                          variant={selectedTimeSlot === slot.time ? 'default' : 'outline'}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className="justify-start"
                        >
                          {slot.time}
                        </Button>
                      ))
                    )}
                  </div>
                )}

                {selectedTimeSlot && (
                  <div className="mt-6">
                    <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <CalendarIcon className="text-primary h-4 w-4" />
                        <span className="font-medium">Selected Time</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTimeSlot}
                      </p>
                      <Button className="mt-4 w-full" onClick={() => setCurrentStep('booking')}>
                        Continue to Booking Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep('calendar')}
              className="mb-4"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Calendar
            </Button>
            <h2 className="mb-2 text-xl font-semibold">Booking Details</h2>
            <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-primary h-4 w-4" />
                <span className="font-medium">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTimeSlot}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleBooking}
              disabled={!formData.name || !formData.email || createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const BookingEmbedSkeleton = () => {
  return (
    <div className="min-h-[600px] w-full p-6">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
