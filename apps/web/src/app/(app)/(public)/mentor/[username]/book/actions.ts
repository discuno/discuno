'use server'

import { env } from '~/env'
import { BadRequestError, ExternalApiError } from '~/lib/errors'
import { getMentorCalcomTokensByUsername, getMentorEnabledEventTypes } from '~/server/queries'

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
 * Fetch available event types for a given username (filtered by mentor's preferences)
 */
export const fetchEventTypes = async (username: string): Promise<EventType[]> => {
  const mentorTokens = await getMentorCalcomTokensByUsername(username)
  console.log('Fetched mentor tokens:', mentorTokens)

  if (!mentorTokens) {
    throw new ExternalApiError(`No Cal.com tokens found for user: ${username}`)
  }

  const mentorPrefs = await getMentorEnabledEventTypes(mentorTokens.userId)

  console.log('Fetched mentor preferences:', mentorPrefs)

  if (!mentorPrefs.length) {
    return []
  }

  const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types`)
  url.searchParams.append('username', username)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
      'cal-api-version': '2024-06-14',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new ExternalApiError(`Failed to fetch event types: ${res.status} ${err}`)
  }

  const data = await res.json()

  if (data.status !== 'success' || !Array.isArray(data.data)) {
    throw new ExternalApiError('Invalid event types response')
  }

  const enabledIds = new Set(mentorPrefs.map(p => p.calcomEventTypeId))
  const prefMap = new Map(mentorPrefs.map(p => [p.calcomEventTypeId, p]))

  return data.data
    .filter((et: any) => enabledIds.has(et.id))
    .map((et: any) => {
      const pref = prefMap.get(et.id)
      if (!pref) {
        throw new ExternalApiError(`Missing preference for event type ${et.id}`)
      }
      return {
        id: et.id,
        title: et.title,
        slug: et.slug,
        length: et.lengthInMinutes ?? et.length,
        description: et.description,
        price: pref.customPrice ? pref.customPrice / 100 : (et.price ?? null),
        currency: pref.currency,
      }
    })
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
  // Build date range
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const url = new URL(`${env.NEXT_PUBLIC_CALCOM_API_URL}/slots`)
  url.searchParams.append('username', username)
  url.searchParams.append('eventTypeSlug', eventSlug)
  url.searchParams.append('start', start.toISOString())
  url.searchParams.append('end', end.toISOString())
  if (timeZone) url.searchParams.append('timeZone', timeZone)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
      'cal-api-version': '2024-09-04',
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new ExternalApiError(`Failed to fetch slots: ${response.status} ${err}`)
  }

  const data: AvailableSlotsResponse = await response.json()

  if (data.status !== 'success' || typeof data.data !== 'object') {
    throw new ExternalApiError('Invalid slots response')
  }

  const key = start.toISOString().split('T')[0]

  if (!key) {
    throw new BadRequestError('No slots available for the selected date')
  }

  const raw = data.data[key] ?? []

  return raw.map((s: any) => ({
    time: new Date(s.start).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone ?? 'America/New_York',
    }),
    available: true,
  }))
}

/**
 * Create a booking via Cal.com API
 */
export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'cal-api-version': '2024-08-13',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new ExternalApiError(`Failed to create booking: ${response.status} ${err}`)
  }

  const data = await response.json()

  if (data.status === 'success' && data.data?.uid) {
    return data.data.uid
  }

  throw new ExternalApiError(data.error ?? 'Unknown booking error')
}
