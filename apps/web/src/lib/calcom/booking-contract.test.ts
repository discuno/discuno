import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  calcomRequest: vi.fn(),
  storeCalcomConnectionForUser: vi.fn(),
}))

vi.mock('~/lib/calcom/client', () => ({
  CALCOM_API_VERSIONS: {
    bookings: '2026-02-25',
    bookingList: '2026-05-01',
    eventTypes: '2024-06-14',
    schedules: '2024-06-11',
    slots: '2024-09-04',
  },
  calcomRequest: mocks.calcomRequest,
}))

vi.mock('~/lib/services/calcom-tokens-service', () => ({
  storeCalcomConnectionForUser: mocks.storeCalcomConnectionForUser,
}))

import {
  createCalcomBooking,
  findCalcomBookingByPaymentId,
  getCalcomBooking,
  getCalcomBookingCompatibility,
} from '~/lib/calcom'
import { ExternalApiError } from '~/lib/errors'

const BOOKING_START = '2099-01-02T15:00:00.000Z'
const BOOKING_END = '2099-01-02T15:30:00.000Z'
const BOOKING_LENGTH_MINUTES = 30
const EVENT_LOCATION = {
  type: 'integration',
  integration: 'cal-video',
}

const bookingInput = {
  calcomEventTypeId: 42,
  start: BOOKING_START,
  attendeeName: 'Test Student',
  attendeeEmail: 'student@example.edu',
  bookingTitle: 'Choosing between computer science and design',
  timeZone: 'America/New_York',
  mentorUserId: 'mentor-user-id',
}

const compatibleEventTypeResponse = {
  status: 'success',
  data: {
    lengthInMinutes: BOOKING_LENGTH_MINUTES,
    requiresBookerEmailVerification: false,
    bookingRequiresAuthentication: false,
    price: 0,
    currency: 'USD',
    locations: [EVENT_LOCATION],
    recurrence: null,
    confirmationPolicy: { disabled: true },
    bookingFields: [
      { slug: 'name', required: true, isDefault: true },
      { slug: 'email', required: true, isDefault: true },
      { slug: 'title', required: true, isDefault: true },
    ],
  },
}

const createdBookingResponse = {
  status: 'success',
  data: {
    id: 123,
    uid: 'booking-uid',
    start: BOOKING_START,
    end: BOOKING_END,
    duration: BOOKING_LENGTH_MINUTES,
    meetingUrl: 'https://cal.example/video/booking-uid',
  },
}

const bookingListPage = ({
  data = [],
  hasMore = false,
  nextCursor = null,
}: {
  data?: Array<{
    id: number
    uid: string
    status: string
    start: string
    end: string
    metadata: Record<string, unknown>
  }>
  hasMore?: boolean
  nextCursor?: string | null
}) => ({
  status: 'success',
  data,
  pagination: { hasMore, nextCursor },
})

const getCreateBookingBody = () => {
  const createCall = mocks.calcomRequest.mock.calls.find(([path]) => path === '/bookings')
  expect(createCall).toBeDefined()

  const init = createCall?.[1] as RequestInit
  expect(typeof init.body).toBe('string')
  if (typeof init.body !== 'string') throw new TypeError('Expected a JSON request body')

  return JSON.parse(init.body) as {
    attendee: Record<string, unknown>
    bookingFieldsResponses?: Record<string, unknown>
    lengthInMinutes?: number
    location?: Record<string, unknown>
    metadata: Record<string, unknown>
  }
}

describe('Cal.com booking contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.calcomRequest.mockImplementation(path => {
      if (path === '/event-types/42') return Promise.resolve(compatibleEventTypeResponse)
      if (path === '/bookings') return Promise.resolve(createdBookingResponse)
      throw new Error(`Unexpected Cal.com request: ${String(path)}`)
    })
  })

  it.each([undefined, '', '   '])('omits an absent or blank attendee phone (%s)', async phone => {
    await createCalcomBooking({
      ...bookingInput,
      attendeePhone: phone,
    })

    expect(getCreateBookingBody().attendee).not.toHaveProperty('phoneNumber')
  })

  it('trims and preserves a valid attendee phone', async () => {
    await createCalcomBooking({
      ...bookingInput,
      attendeePhone: '  +1 555 010 9999  ',
    })

    expect(getCreateBookingBody().attendee).toMatchObject({
      phoneNumber: '+1 555 010 9999',
    })
  })

  it('omits optional metadata keys when no values are supplied', async () => {
    await createCalcomBooking(bookingInput)

    expect(getCreateBookingBody().metadata).toEqual({
      mentorUserId: 'mentor-user-id',
    })
  })

  it("forwards the student question as Cal.com's required booking title", async () => {
    await createCalcomBooking(bookingInput)

    expect(getCreateBookingBody().bookingFieldsResponses).toEqual({
      title: bookingInput.bookingTitle,
    })
  })

  it.each(['   ', 'x', 'x'.repeat(201)])(
    'rejects an invalid booking title before contacting Cal.com',
    async bookingTitle => {
      await expect(createCalcomBooking({ ...bookingInput, bookingTitle })).rejects.toThrow(
        'Cal.com booking title must be between 3 and 200 characters'
      )

      expect(mocks.calcomRequest).not.toHaveBeenCalled()
    }
  )

  it('verifies the fixed event duration without sending Cal.com a variable-duration field', async () => {
    await createCalcomBooking({
      ...bookingInput,
      lengthInMinutes: BOOKING_LENGTH_MINUTES,
    })

    const body = getCreateBookingBody()
    expect(body).not.toHaveProperty('lengthInMinutes')
    expect(body.location).toEqual(EVENT_LOCATION)
  })

  it.each([
    {
      scenario: 'start time',
      data: {
        ...createdBookingResponse.data,
        start: '2099-01-02T15:05:00.000Z',
        end: '2099-01-02T15:35:00.000Z',
      },
      error: 'unexpected start time',
    },
    {
      scenario: 'reported duration',
      data: { ...createdBookingResponse.data, duration: 45 },
      error: 'unexpected duration',
    },
    {
      scenario: 'derived end time',
      data: {
        ...createdBookingResponse.data,
        end: '2099-01-02T15:45:00.000Z',
      },
      error: 'unexpected duration',
    },
  ])('fails closed when Cal.com returns a mismatched $scenario', async ({ data, error }) => {
    mocks.calcomRequest.mockImplementation(path => {
      if (path === '/event-types/42') return Promise.resolve(compatibleEventTypeResponse)
      if (path === '/bookings') return Promise.resolve({ status: 'success', data })
      throw new Error(`Unexpected Cal.com request: ${String(path)}`)
    })

    await expect(
      createCalcomBooking({
        ...bookingInput,
        lengthInMinutes: BOOKING_LENGTH_MINUTES,
      })
    ).rejects.toThrow(error)
  })

  it('rechecks compatibility immediately before creating the booking', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        ...compatibleEventTypeResponse.data,
        requiresBookerEmailVerification: true,
      },
    })

    await expect(createCalcomBooking(bookingInput)).rejects.toThrow(
      'Cal.com event type is incompatible with Discuno booking'
    )
    expect(mocks.calcomRequest).not.toHaveBeenCalledWith(
      '/bookings',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('Cal.com event-type booking compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports every unsupported booking requirement', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        ...compatibleEventTypeResponse.data,
        requiresBookerEmailVerification: true,
        bookingRequiresAuthentication: true,
        recurrence: { frequency: 'weekly' },
        confirmationPolicy: { type: 'always' },
        bookingFields: [
          { slug: 'name', required: true, isDefault: true },
          { slug: 'studentGoal', required: true, isDefault: false },
        ],
      },
    })

    await expect(getCalcomBookingCompatibility(42, bookingInput.mentorUserId)).resolves.toEqual({
      compatible: false,
      reasons: [
        'email_verification_required',
        'cal_authentication_required',
        'recurring_event_type',
        'requires_confirmation',
        'unsupported_required_booking_fields',
      ],
    })
    expect(mocks.calcomRequest).toHaveBeenCalledWith('/event-types/42', {
      apiVersion: '2024-06-14',
      userId: bookingInput.mentorUserId,
    })
  })

  it('accepts standard fields and optional custom fields', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        ...compatibleEventTypeResponse.data,
        bookingFields: [
          { slug: 'name', required: true, isDefault: true },
          { slug: 'email', required: true, isDefault: true },
          { slug: 'title', required: true, isDefault: true },
          { slug: 'company', required: false, isDefault: false },
        ],
      },
    })

    await expect(getCalcomBookingCompatibility(42, bookingInput.mentorUserId)).resolves.toEqual({
      compatible: true,
      reasons: [],
    })
  })

  it('accepts a recurrence configuration that Cal.com explicitly marks disabled', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        ...compatibleEventTypeResponse.data,
        recurrence: { interval: 1, occurrences: 4, disabled: true },
      },
    })

    await expect(getCalcomBookingCompatibility(42, bookingInput.mentorUserId)).resolves.toEqual({
      compatible: true,
      reasons: [],
    })
  })

  it.each(['attendeeAddress', 'attendeePhone', 'attendeeDefined', 'unknown'])(
    'rejects a %s location that requires unsupported booking input',
    async locationType => {
      mocks.calcomRequest.mockResolvedValue({
        status: 'success',
        data: {
          ...compatibleEventTypeResponse.data,
          locations: [{ type: locationType }],
        },
      })

      await expect(getCalcomBookingCompatibility(42, bookingInput.mentorUserId)).resolves.toEqual({
        compatible: false,
        reasons: ['booker_location_required'],
      })
    }
  )

  it('fails closed when Cal.com omits a critical compatibility field', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        requiresBookerEmailVerification: false,
        bookingRequiresAuthentication: false,
        recurrence: null,
        bookingFields: [],
      },
    })

    await expect(getCalcomBookingCompatibility(42, bookingInput.mentorUserId)).rejects.toThrow()
  })
})

describe('Cal.com booking reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const matchingBooking = {
    id: 123,
    uid: 'booking-uid',
    status: 'accepted',
    start: BOOKING_START,
    end: BOOKING_END,
    metadata: { paymentId: '77' },
  }

  const reconcilePayment = () =>
    findCalcomBookingByPaymentId({
      paymentId: 77,
      attendeeEmail: bookingInput.attendeeEmail,
      eventTypeId: bookingInput.calcomEventTypeId,
      mentorUserId: bookingInput.mentorUserId,
    })

  it('follows current cursor pagination and finds a match on page two', async () => {
    mocks.calcomRequest
      .mockResolvedValueOnce(bookingListPage({ hasMore: true, nextCursor: 'cursor-page-2' }))
      .mockResolvedValueOnce(bookingListPage({ data: [matchingBooking] }))

    await expect(reconcilePayment()).resolves.toEqual({ ...matchingBooking, duration: 30 })
    expect(mocks.calcomRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('cursor=cursor-page-2'),
      {
        apiVersion: '2026-05-01',
        userId: bookingInput.mentorUserId,
      }
    )
  })

  it.each(['cancelled', 'rejected'])('rejects a matching terminal %s booking', async status => {
    mocks.calcomRequest.mockResolvedValue(
      bookingListPage({ data: [{ ...matchingBooking, status }] })
    )

    await expect(reconcilePayment()).rejects.toThrow(
      'matching Cal.com booking is already in a terminal state'
    )
  })

  it('rejects a missing cursor while Cal.com claims another page exists', async () => {
    mocks.calcomRequest.mockResolvedValue(bookingListPage({ hasMore: true, nextCursor: null }))

    await expect(reconcilePayment()).rejects.toThrow(
      'Cal.com returned an invalid booking pagination cursor'
    )
    expect(mocks.calcomRequest).toHaveBeenCalledTimes(1)
  })

  it('rejects a repeated pagination cursor', async () => {
    mocks.calcomRequest
      .mockResolvedValueOnce(bookingListPage({ hasMore: true, nextCursor: 'repeated-cursor' }))
      .mockResolvedValueOnce(bookingListPage({ hasMore: true, nextCursor: 'repeated-cursor' }))

    await expect(reconcilePayment()).rejects.toThrow(
      'Cal.com returned an invalid booking pagination cursor'
    )
    expect(mocks.calcomRequest).toHaveBeenCalledTimes(2)
  })

  it('fails closed after the ten-page reconciliation safety bound', async () => {
    for (let page = 1; page <= 10; page += 1) {
      mocks.calcomRequest.mockResolvedValueOnce(
        bookingListPage({ hasMore: true, nextCursor: `cursor-${page}` })
      )
    }

    await expect(reconcilePayment()).rejects.toThrow(
      'Cal.com booking reconciliation exceeded its safe page limit'
    )
    expect(mocks.calcomRequest).toHaveBeenCalledTimes(10)
  })

  it('uses a preexisting create marker for reconciliation only and never POSTs again', async () => {
    mocks.calcomRequest.mockImplementation(path => {
      if (String(path).startsWith('/bookings?')) {
        return Promise.resolve(bookingListPage({ data: [] }))
      }
      throw new Error(`Unexpected Cal.com request: ${String(path)}`)
    })

    await expect(
      createCalcomBooking({
        ...bookingInput,
        paymentId: 77,
        lengthInMinutes: BOOKING_LENGTH_MINUTES,
        providerMutationMayBeInFlight: true,
      })
    ).rejects.toThrow('prior Cal.com booking create attempt')

    expect(mocks.calcomRequest).toHaveBeenCalledOnce()
    expect(mocks.calcomRequest.mock.calls.some(([path]) => path === '/bookings')).toBe(false)
  })

  it.each([401, 409, 422])(
    'resolves the durable create marker after a definitive Cal.com %s rejection',
    async providerStatus => {
      const markCreateAttempt = vi.fn().mockResolvedValue(undefined)
      const resolveCreateRejection = vi.fn().mockResolvedValue(undefined)
      mocks.calcomRequest.mockImplementation(async (path, init) => {
        if (String(path).startsWith('/bookings?')) {
          return bookingListPage({ data: [] })
        }
        if (path === '/event-types/42') return compatibleEventTypeResponse
        if (path === '/bookings') {
          await init?.onBeforeRequest?.()
          throw new ExternalApiError('Cal.com rejected booking creation', providerStatus)
        }
        throw new Error(`Unexpected Cal.com request: ${String(path)}`)
      })

      await expect(
        createCalcomBooking({
          ...bookingInput,
          paymentId: 77,
          lengthInMinutes: BOOKING_LENGTH_MINUTES,
          onBeforeCreateAttempt: markCreateAttempt,
          onDefinitiveCreateRejection: resolveCreateRejection,
        })
      ).rejects.toMatchObject({ providerStatus })

      expect(markCreateAttempt).toHaveBeenCalledOnce()
      expect(resolveCreateRejection).toHaveBeenCalledOnce()
    }
  )

  it('resolves the first marker before an OAuth refresh failure prevents a retry', async () => {
    const markCreateAttempt = vi.fn().mockResolvedValue(undefined)
    const resolveCreateRejection = vi.fn().mockResolvedValue(undefined)
    mocks.calcomRequest.mockImplementation(async (path, init) => {
      if (String(path).startsWith('/bookings?')) return bookingListPage({ data: [] })
      if (path === '/event-types/42') return compatibleEventTypeResponse
      if (path === '/bookings') {
        await init?.onBeforeRequest?.()
        await init?.onDefinitiveResponseBeforeRetry?.(401)
        throw new Error('Cal.com OAuth refresh unavailable')
      }
      throw new Error(`Unexpected Cal.com request: ${String(path)}`)
    })

    await expect(
      createCalcomBooking({
        ...bookingInput,
        paymentId: 77,
        lengthInMinutes: BOOKING_LENGTH_MINUTES,
        onBeforeCreateAttempt: markCreateAttempt,
        onDefinitiveCreateRejection: resolveCreateRejection,
      })
    ).rejects.toThrow('Cal.com OAuth refresh unavailable')

    expect(markCreateAttempt).toHaveBeenCalledOnce()
    expect(resolveCreateRejection).toHaveBeenCalledOnce()
  })

  it.each([408, 500])(
    'keeps the durable create marker after an ambiguous Cal.com %s failure',
    async providerStatus => {
      const resolveCreateRejection = vi.fn().mockResolvedValue(undefined)
      mocks.calcomRequest.mockImplementation(async (path, init) => {
        if (String(path).startsWith('/bookings?')) return bookingListPage({ data: [] })
        if (path === '/event-types/42') return compatibleEventTypeResponse
        if (path === '/bookings') {
          await init?.onBeforeRequest?.()
          throw new ExternalApiError('Cal.com booking outcome is ambiguous', providerStatus)
        }
        throw new Error(`Unexpected Cal.com request: ${String(path)}`)
      })

      await expect(
        createCalcomBooking({
          ...bookingInput,
          paymentId: 77,
          lengthInMinutes: BOOKING_LENGTH_MINUTES,
          onBeforeCreateAttempt: vi.fn().mockResolvedValue(undefined),
          onDefinitiveCreateRejection: resolveCreateRejection,
        })
      ).rejects.toMatchObject({ providerStatus })

      expect(resolveCreateRejection).not.toHaveBeenCalled()
    }
  )
})

describe('Cal.com booking details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes Cal.com's blank API cancellation actor to missing attribution", async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        id: 123,
        uid: 'booking-uid',
        status: 'cancelled',
        start: '2099-01-02T15:00:00.000Z',
        end: '2099-01-02T15:30:00.000Z',
        duration: 30,
        eventTypeId: 42,
        updatedAt: '2099-01-02T14:00:00.000Z',
        cancelledByEmail: '',
        hosts: [],
        attendees: [],
        metadata: {},
      },
    })

    await expect(getCalcomBooking('booking-uid', bookingInput.mentorUserId)).resolves.toMatchObject(
      {
        cancelledByEmail: undefined,
      }
    )
  })
})
