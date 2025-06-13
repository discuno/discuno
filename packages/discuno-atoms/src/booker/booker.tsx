'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import React, { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useCalContext } from '../provider/cal-provider'
import type { Booking, BookingRequest, EventType } from '../types'

export interface BookerProps {
  eventTypeId?: number
  eventTypeSlug?: string
  username?: string
  _month?: string
  date?: string
  duration?: number
  layout?: 'mobile' | 'desktop' | 'mobile_embed'
  _isTeamEvent?: boolean
  _entity?: Record<string, unknown>
  _bookingForm?: Record<string, unknown>
  hashedLink?: string
  _isInstantMeeting?: boolean
  _rescheduleUid?: string
  _bookingUid?: string
  onBookingComplete?: (booking: Booking) => void
  onError?: (error: Error) => void
  className?: string
  style?: React.CSSProperties
}

interface BookingFormData {
  name: string
  email: string
  phone?: string
  notes?: string
  guests?: string[]
  responses?: Record<string, unknown>
  timeZone: string
  location?: string
}

export function Booker({
  eventTypeId,
  eventTypeSlug,
  username,
  _month,
  date,
  duration,
  layout = 'desktop',
  _isTeamEvent = false,
  _entity,
  _bookingForm,
  hashedLink,
  _isInstantMeeting = false,
  _rescheduleUid,
  _bookingUid,
  onBookingComplete,
  onError,
  className,
  style,
}: BookerProps) {
  const { apiClient } = useCalContext()
  const queryClient = useQueryClient()

  // Add hydration check to prevent SSR/client mismatches
  // In test environment, assume we're hydrated
  const [isHydrated, setIsHydrated] = useState(typeof window !== 'undefined' && process.env.NODE_ENV === 'test')

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Compute initial step to ensure server/client consistency
  const computeInitialStep = (): 'eventType' | 'datetime' | 'form' | 'confirmation' => {
    if (eventTypeId || eventTypeSlug) {
      return 'datetime'
    }
    return 'eventType'
  }

  // All hooks must be at the top level
  const [currentStep, setCurrentStep] = useState<'eventType' | 'datetime' | 'form' | 'confirmation'>(
    computeInitialStep()
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(date ?? null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)
  const [bookingData, setBookingData] = useState<BookingFormData>({
    name: '',
    email: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch event type
  const {
    data: eventType,
    isLoading: isLoadingEventType,
    error: eventTypeError,
  } = useQuery({
    queryKey: ['eventType', eventTypeId, eventTypeSlug, username],
    queryFn: async () => {
      if (!apiClient) throw new Error('API client not available')
      if (eventTypeId) {
        return await apiClient.getEventType(eventTypeId)
      } else if (eventTypeSlug && username) {
        // For public event types, we'd typically use a different endpoint
        return await apiClient.getEventTypeBySlug(eventTypeSlug)
      }
      throw new Error('No event type identifier provided')
    },
    enabled: !!(isHydrated && apiClient && (eventTypeId ?? (eventTypeSlug && username))),
    retry: 1,
    staleTime: 0, // Force fresh data to avoid hydration issues
  })

  // Fetch available slots for selected date
  const { data: availableSlots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['availableSlots', eventType?.id, selectedDate, bookingData.timeZone],
    queryFn: async () => {
      if (!apiClient || !eventType?.id || !selectedDate) return []

      const startTime = `${selectedDate}T00:00:00.000Z`
      const endTime = `${selectedDate}T23:59:59.999Z`

      return await apiClient.getAvailableSlots(eventType.id, startTime, endTime, bookingData.timeZone)
    },
    enabled: !!(isHydrated && apiClient && eventType?.id && selectedDate),
    retry: 1,
    staleTime: 0, // Force fresh data to avoid hydration issues
  })

  // Set initial event type if provided
  useEffect(() => {
    if (eventType && !selectedEventType) {
      setSelectedEventType(eventType)
    }
  }, [eventType, selectedEventType])

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingRequest) => {
      if (!apiClient) throw new Error('API client not available')
      return await apiClient.createBooking(data)
    },
    onSuccess: booking => {
      setCurrentStep('confirmation')
      onBookingComplete?.(booking)
      // Invalidate relevant queries
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['availableSlots'] })
    },
    onError: error => {
      onError?.(error instanceof Error ? error : new Error('Booking failed'))
    },
  })

  const handleBookingSubmit = async () => {
    if (!selectedEventType || !selectedDate || !selectedTime) {
      onError?.(new Error('Missing required booking information'))
      return
    }

    setIsSubmitting(true)

    try {
      const bookingRequest: BookingRequest = {
        eventTypeId: selectedEventType.id,
        start: `${selectedDate}T${selectedTime}:00.000Z`,
        end: new Date(
          new Date(`${selectedDate}T${selectedTime}:00.000Z`).getTime() +
            (duration ?? selectedEventType.length) * 60 * 1000
        ).toISOString(),
        responses: {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          notes: bookingData.notes,
          guests: bookingData.guests,
          ...bookingData.responses,
        },
        timeZone: bookingData.timeZone,
        language: 'en',
        location: bookingData.location,
      }

      if (hashedLink) {
        bookingRequest.hasHashedBookingLink = true
        bookingRequest.hashedLink = hashedLink
      }

      await createBookingMutation.mutateAsync(bookingRequest)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Booking submission failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine if we should show loading state
  const shouldShowLoading =
    !isHydrated ||
    !apiClient ||
    (isLoadingEventType && Boolean(eventTypeId ?? eventTypeSlug)) ||
    isLoadingSlots ||
    isSubmitting

  // Handle errors
  useEffect(() => {
    if (eventTypeError) {
      onError?.(new Error('Failed to load event type'))
    }
  }, [eventTypeError, onError])

  const containerClasses = `cal-booker ${layout} ${className ?? ''}`

  // Show consistent loading state until hydrated and API client is ready
  if (shouldShowLoading) {
    return (
      <div className={containerClasses} style={style}>
        <div className="loading-state p-6 text-center">
          <div className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">
            {!isHydrated
              ? 'Loading...'
              : !apiClient
                ? 'Initializing Cal.com connection...'
                : isLoadingEventType
                  ? 'Loading event type...'
                  : isLoadingSlots
                    ? 'Loading available times...'
                    : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses} style={style}>
      {/* Event Type Selection Step */}
      {currentStep === 'eventType' && (
        <div className="step-event-type">
          <h2>Select a meeting type</h2>
          {eventType ? (
            <div
              className="event-type-card"
              onClick={() => {
                setSelectedEventType(eventType)
                setCurrentStep('datetime')
              }}
            >
              <h3>{eventType.title}</h3>
              <p>{eventType.description}</p>
              <span>{eventType.length} minutes</span>
            </div>
          ) : (
            <div>Failed to load event types</div>
          )}
        </div>
      )}

      {/* Date & Time Selection Step */}
      {currentStep === 'datetime' && selectedEventType && (
        <div className="step-datetime">
          <div className="event-type-header">
            <h2>Select a date & time</h2>
            <h3>{selectedEventType.title}</h3>
            <p>{selectedEventType.length} minutes</p>
          </div>

          <div className="datetime-selector">
            <div className="date-picker">
              <h3>Select Date</h3>
              {/* Simple date buttons for demo - in real implementation, use a proper calendar */}
              {Array.from({ length: 14 }, (_, i) => {
                const date = addDays(new Date(), i)
                const dateStr = format(date, 'yyyy-MM-dd')
                return (
                  <Button
                    key={dateStr}
                    variant={selectedDate === dateStr ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedDate(dateStr)
                    }}
                  >
                    {format(date, 'MMM d')}
                  </Button>
                )
              })}
            </div>

            {selectedDate && (
              <div className="time-picker">
                <h3>Select Time</h3>
                {availableSlots?.length ? (
                  <div className="time-slots">
                    {availableSlots.map(slot => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedTime(slot.time)
                          setCurrentStep('form')
                        }}
                      >
                        {format(new Date(`1970-01-01T${slot.time}`), 'h:mm a')}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div>No available times for this date</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Form Step */}
      {currentStep === 'form' && (
        <div className="step-form">
          <div className="booking-summary">
            <h3>{selectedEventType?.title}</h3>
            <p>{format(new Date(`${selectedDate}T${selectedTime}`), 'EEEE, MMMM d, yyyy at h:mm a')}</p>
            <p>{selectedEventType?.length} minutes</p>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              void handleBookingSubmit()
            }}
          >
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                required
                value={bookingData.name}
                onChange={e => {
                  setBookingData(prev => ({ ...prev, name: e.target.value }))
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                required
                value={bookingData.email}
                onChange={e => {
                  setBookingData(prev => ({ ...prev, email: e.target.value }))
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={bookingData.phone ?? ''}
                onChange={e => {
                  setBookingData(prev => ({ ...prev, phone: e.target.value }))
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                value={bookingData.notes ?? ''}
                onChange={e => {
                  setBookingData(prev => ({ ...prev, notes: e.target.value }))
                }}
              />
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentStep('datetime')
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Confirm Booking
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Step */}
      {currentStep === 'confirmation' && (
        <div className="step-confirmation">
          <h2>Booking Confirmed!</h2>
          <p>Your booking has been successfully created.</p>
          <div className="confirmation-details">
            <h3>{selectedEventType?.title}</h3>
            <p>{format(new Date(`${selectedDate}T${selectedTime}`), 'EEEE, MMMM d, yyyy at h:mm a')}</p>
            <p>{selectedEventType?.length} minutes</p>
          </div>
        </div>
      )}
    </div>
  )
}
