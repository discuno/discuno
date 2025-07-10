'use server'

import { env } from '~/env'

interface TimeSlot {
  time: string
  available: boolean
}

export interface EventType {
  id: number
  title: string
  slug: string
  length: number
  description?: string
  price?: number
  currency?: string
}

interface BookingData {
  name: string
  email: string
  timeZone?: string
}

interface CreateBookingInput {
  username: string
  eventSlug: string
  startTime: string // ISO string
  attendee: BookingData
}

type AvailableSlotsResponse = {
  status: 'success' | 'error'
  data: {
    [date: string]: {
      start: string // ISO 8601 string with timezone offset
    }[]
  }
}

/**
 * Fetch available event types for a given username
 */
export const fetchEventTypes = async (username: string): Promise<EventType[]> => {
  try {
    const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types`)
    url.searchParams.append('username', username)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-06-14',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch event types:', response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log('Event types response:', data)

    if (data.status === 'success' && data.data && Array.isArray(data.data)) {
      return data.data.map((eventType: any) => ({
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        length: eventType.lengthInMinutes ?? eventType.length,
        description: eventType.description,
        price: eventType.price ?? null,
        currency: eventType.currency ?? 'USD',
      }))
    }

    console.warn('Unexpected event types response structure:', data)
    return []
  } catch (error) {
    console.error('Error fetching event types:', error)
    return []
  }
}

/**
 * Fetch available slots for a given date and username
 */
export const fetchAvailableSlots = async (
  username: string,
  eventSlug: string,
  date: Date,
  timeZone?: string
): Promise<TimeSlot[]> => {
  try {
    // Format date for Cal.com API
    const startTime = new Date(date)
    startTime.setHours(0, 0, 0, 0)
    const endTime = new Date(date)
    endTime.setHours(23, 59, 59, 999)

    // Cal.com API v2 slots endpoint
    const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/slots`)
    url.searchParams.append('eventTypeSlug', eventSlug)
    url.searchParams.append('username', username)
    url.searchParams.append('start', startTime.toISOString())
    url.searchParams.append('end', endTime.toISOString())
    if (timeZone) {
      url.searchParams.append('timeZone', timeZone)
    }

    const response: Response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-09-04',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch slots:', response.status, errorText)
      return []
    }

    const data: AvailableSlotsResponse = await response.json()

    // Transform Cal.com slots to our format
    const slots: TimeSlot[] = []
    if (data.status === 'success' && typeof data.data === 'object') {
      const dateKey = startTime.toISOString().split('T')[0] // Extract YYYY-MM-DD
      const slotsForDate = dateKey ? data.data[dateKey as keyof typeof data.data] : undefined

      if (Array.isArray(slotsForDate)) {
        slotsForDate.forEach((slot: any) => {
          const time = new Date(slot.start).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: timeZone ?? 'America/New_York',
          })
          slots.push({
            time,
            available: true,
          })
        })
      }
    }

    return slots
  } catch (error) {
    console.error('Error fetching slots:', error)
    return []
  }
}

/**
 * Create a booking via Cal.com API
 */
export const createBooking = async (
  input: CreateBookingInput
): Promise<{
  success: boolean
  bookingUid?: string
  error?: string
}> => {
  try {
    // Cal.com API v2 bookings endpoint
    const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify({
        username: input.username,
        eventTypeSlug: input.eventSlug,
        start: input.startTime,
        attendee: {
          name: input.attendee.name,
          email: input.attendee.email,
          timeZone: input.attendee.timeZone ?? 'America/New_York',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create booking:', response.status, errorText)
      return {
        success: false,
        error: `Failed to create booking: ${response.status}`,
      }
    }

    const data = await response.json()

    if (data.status === 'success' && data.data) {
      return {
        success: true,
        bookingUid: data.data.uid,
      }
    }

    return {
      success: false,
      error: data.error ?? 'Unknown booking error',
    }
  } catch (error) {
    console.error('Error creating booking:', error)
    return {
      success: false,
      error: 'Failed to create booking due to network error',
    }
  }
}
