import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingRequest, CalApiConfig, EventType } from '../types'
import { CalApiClient } from './api-client'

// Mock fetch globally
global.fetch = vi.fn()

describe('CalApiClient', () => {
  let client: CalApiClient
  let mockConfig: CalApiConfig
  const mockFetch = global.fetch as any

  beforeEach(() => {
    mockConfig = {
      apiUrl: 'https://api.cal.com/v2',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: 'test-client-id',
    }

    client = new CalApiClient(mockConfig)
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with correct config', () => {
      expect(client).toBeInstanceOf(CalApiClient)
    })

    it('should set authorization header when access token provided', () => {
      const clientWithToken = new CalApiClient({
        ...mockConfig,
        accessToken: 'test-token',
      })
      expect(clientWithToken).toBeInstanceOf(CalApiClient)
    })

    it('should work without access token', () => {
      const clientWithoutToken = new CalApiClient({
        ...mockConfig,
        accessToken: undefined,
      })
      expect(clientWithoutToken).toBeInstanceOf(CalApiClient)
    })
  })

  describe('HTTP Request Methods', () => {
    it('should make GET requests correctly', async () => {
      const mockResponse = {
        status: 'success',
        data: { id: 1, title: 'Test Event' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getEventTypes()

      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/event-types', {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer test-access-token',
        },
      })

      expect(result).toEqual(mockResponse.data)
    })

    it('should make POST requests correctly', async () => {
      const mockBookingData = {
        eventTypeId: 123,
        start: '2024-01-15T10:00:00.000Z',
        end: '2024-01-15T11:00:00.000Z',
        responses: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        timeZone: 'UTC',
        language: 'en',
      }

      const mockResponse = {
        status: 'success',
        data: { id: 456, ...mockBookingData },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createBooking(mockBookingData as BookingRequest)

      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer test-access-token',
        },
        body: JSON.stringify(mockBookingData),
      })

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle HTTP errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Unauthorized access' }),
      })

      await expect(client.getEventTypes()).rejects.toThrow('API Error 401: Unauthorized access')
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(client.getEventTypes()).rejects.toThrow('Invalid JSON')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.getEventTypes()).rejects.toThrow('Network error')
    })
  })

  describe('Event Types', () => {
    it('should get event types successfully', async () => {
      const mockEventTypes = [
        { id: 1, title: '30min Meeting', length: 30 },
        { id: 2, title: '60min Meeting', length: 60 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockEventTypes }),
      })

      const result = await client.getEventTypes()

      expect(result).toEqual(mockEventTypes)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/event-types',
        expect.any(Object)
      )
    })

    it('should get single event type', async () => {
      const mockEventType = { id: 1, title: '30min Meeting', length: 30 }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockEventType }),
      })

      const result = await client.getEventType(1)

      expect(result).toEqual(mockEventType)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/event-types/1',
        expect.any(Object)
      )
    })

    it('should create event type', async () => {
      const newEventType = {
        title: 'New Meeting',
        length: 45,
        slug: 'new-meeting',
      }

      const mockResponse = { id: 3, ...newEventType }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: mockResponse }),
      })

      const result = await client.createEventType(newEventType as Partial<EventType>)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/event-types', {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(newEventType),
      })
    })

    it('should update event type', async () => {
      const updateData = { title: 'Updated Meeting' }
      const mockResponse = { id: 1, title: 'Updated Meeting', length: 30 }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockResponse }),
      })

      const result = await client.updateEventType(1, updateData)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/event-types/1', {
        method: 'PATCH',
        headers: expect.any(Object),
        body: JSON.stringify(updateData),
      })
    })

    it('should delete event type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success' }),
      })

      await client.deleteEventType(1)

      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/event-types/1', {
        method: 'DELETE',
        headers: expect.any(Object),
      })
    })
  })

  describe('Availability', () => {
    it('should get availability with all parameters', async () => {
      const mockAvailability = {
        busy: [{ start: '2024-01-15T09:00:00.000Z', end: '2024-01-15T10:00:00.000Z' }],
        timeZone: 'UTC',
        workingHours: [{ start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockAvailability }),
      })

      const result = await client.getAvailability(
        123,
        'john-doe',
        '2024-01-15',
        '2024-01-15',
        'UTC'
      )

      expect(result).toEqual(mockAvailability)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/availability?eventTypeId=123&username=john-doe&dateFrom=2024-01-15&dateTo=2024-01-15&timeZone=UTC',
        expect.any(Object)
      )
    })

    it('should get availability with minimal parameters', async () => {
      const mockAvailability = {
        busy: [],
        timeZone: 'UTC',
        workingHours: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockAvailability }),
      })

      const result = await client.getAvailability()

      expect(result).toEqual(mockAvailability)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/availability?',
        expect.any(Object)
      )
    })

    it('should get available slots', async () => {
      const mockSlots = [
        { time: '2024-01-15T10:00:00.000Z', available: true },
        { time: '2024-01-15T11:00:00.000Z', available: true },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockSlots }),
      })

      const result = await client.getAvailableSlots(
        123,
        '2024-01-15T00:00:00.000Z',
        '2024-01-15T23:59:59.999Z',
        'UTC'
      )

      expect(result).toEqual(mockSlots)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/event-types/123/slots?startTime=2024-01-15T00%3A00%3A00.000Z&endTime=2024-01-15T23%3A59%3A59.999Z&timeZone=UTC',
        expect.any(Object)
      )
    })
  })

  describe('Bookings', () => {
    it('should create booking successfully', async () => {
      const bookingData: BookingRequest = {
        eventTypeId: 123,
        start: '2024-01-15T10:00:00.000Z',
        end: '2024-01-15T11:00:00.000Z',
        responses: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        timeZone: 'UTC',
        language: 'en',
      }

      const mockBooking = {
        id: 456,
        uid: 'booking-uid-123',
        ...bookingData,
        status: 'confirmed',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: mockBooking }),
      })

      const result = await client.createBooking(bookingData)

      expect(result).toEqual(mockBooking)
      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/bookings', {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(bookingData),
      })
    })

    it('should get bookings with filters', async () => {
      const mockBookingsResponse = {
        bookings: [
          { id: 1, status: 'confirmed' },
          { id: 2, status: 'confirmed' },
        ],
        nextCursor: 'cursor-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockBookingsResponse }),
      })

      const result = await client.getBookings('confirmed', 10, 0)

      expect(result).toEqual(mockBookingsResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/bookings?status=confirmed&take=10&skip=0',
        expect.objectContaining({
          headers: expect.any(Object),
        })
      )
    })

    it('should get single booking', async () => {
      const mockBooking = {
        id: 456,
        uid: 'booking-uid-123',
        status: 'confirmed',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockBooking }),
      })

      const result = await client.getBooking('booking-uid-123')

      expect(result).toEqual(mockBooking)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/bookings/booking-uid-123',
        expect.any(Object)
      )
    })

    it('should cancel booking', async () => {
      const mockBooking = {
        id: 456,
        uid: 'booking-uid-123',
        status: 'cancelled',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockBooking }),
      })

      const result = await client.cancelBooking('booking-uid-123', 'No longer needed')

      expect(result).toEqual(mockBooking)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/bookings/booking-uid-123/cancel',
        {
          method: 'POST',
          headers: expect.any(Object),
          body: JSON.stringify({ reason: 'No longer needed' }),
        }
      )
    })

    it('should reschedule booking', async () => {
      const rescheduleData = {
        start: '2024-01-16T10:00:00.000Z',
        end: '2024-01-16T11:00:00.000Z',
        reason: 'Schedule conflict',
      }

      const mockBooking = {
        id: 456,
        uid: 'booking-uid-123',
        ...rescheduleData,
        status: 'confirmed',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockBooking }),
      })

      const result = await client.rescheduleBooking('booking-uid-123', rescheduleData)

      expect(result).toEqual(mockBooking)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cal.com/v2/bookings/booking-uid-123/reschedule',
        {
          method: 'POST',
          headers: expect.any(Object),
          body: JSON.stringify(rescheduleData),
        }
      )
    })
  })

  describe('Schedules', () => {
    it('should get schedules', async () => {
      const mockSchedules = [
        { id: 1, name: 'Work Schedule', isDefault: true },
        { id: 2, name: 'Weekend Schedule', isDefault: false },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: mockSchedules }),
      })

      const result = await client.getSchedules()

      expect(result).toEqual(mockSchedules)
      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/schedules', expect.any(Object))
    })

    it('should create schedule', async () => {
      const scheduleData = {
        name: 'New Schedule',
        timeZone: 'UTC',
        availability: [],
      }

      const mockSchedule = { id: 3, ...scheduleData }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: mockSchedule }),
      })

      const result = await client.createSchedule(scheduleData)

      expect(result).toEqual(mockSchedule)
      expect(mockFetch).toHaveBeenCalledWith('https://api.cal.com/v2/schedules', {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(scheduleData),
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API error responses', async () => {
      const errorResponse = {
        status: 'error',
        error: { message: 'Event type not found', code: 'NOT_FOUND' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorResponse),
      })

      await expect(client.getEventType(999)).rejects.toThrow('API Error 404: Event type not found')
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      // Should handle missing data field gracefully
      const result = await client.getEventTypes()
      expect(result).toBeUndefined()
    })

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })

      const result = await client.getEventTypes()
      expect(result).toBeUndefined()
    })
  })

  describe('Authentication', () => {
    it('should include authorization header when token provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: [] }),
      })

      await client.getEventTypes()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      )
    })

    it('should work without authorization header when no token', async () => {
      const clientNoAuth = new CalApiClient({
        ...mockConfig,
        accessToken: undefined,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: [] }),
      })

      await clientNoAuth.getEventTypes()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })
  })
})
