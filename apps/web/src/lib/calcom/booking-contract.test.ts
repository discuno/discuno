import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  calcomRequest: vi.fn(),
  storeCalcomConnectionForUser: vi.fn(),
}))

vi.mock('~/env', () => ({
  env: {
    CALCOM_ORG_ID: '123',
    COLLEGE_MENTOR_TEAM_ID: '456',
  },
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

import { createCalcomBooking, getCalcomBooking, getCalcomBookingCompatibility } from '~/lib/calcom'

const bookingInput = {
  calcomEventTypeId: 42,
  start: '2099-01-02T15:00:00.000Z',
  attendeeName: 'Test Student',
  attendeeEmail: 'student@example.edu',
  timeZone: 'America/New_York',
  mentorUserId: 'mentor-user-id',
}

const getCreateBookingBody = () => {
  const createCall = mocks.calcomRequest.mock.calls.find(([path]) => path === '/bookings')
  expect(createCall).toBeDefined()

  const init = createCall?.[1] as RequestInit
  expect(typeof init.body).toBe('string')
  if (typeof init.body !== 'string') throw new TypeError('Expected a JSON request body')

  return JSON.parse(init.body) as {
    attendee: Record<string, unknown>
    metadata: Record<string, unknown>
  }
}

describe('Cal.com booking contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: { id: 123, uid: 'booking-uid' },
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
})

describe('Cal.com event-type booking compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports every unsupported booking requirement', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        requiresBookerEmailVerification: true,
        bookingRequiresAuthentication: true,
        recurrence: { frequency: 'weekly' },
        bookingFields: [
          { slug: 'name', required: true, isDefault: true },
          { slug: 'company', required: true, isDefault: false },
        ],
      },
    })

    await expect(getCalcomBookingCompatibility(42)).resolves.toEqual({
      compatible: false,
      reasons: [
        'email_verification_required',
        'cal_authentication_required',
        'recurring_event_type',
        'required_custom_booking_fields',
      ],
    })
    expect(mocks.calcomRequest).toHaveBeenCalledWith('/event-types/42', {
      apiVersion: '2024-06-14',
    })
  })

  it('accepts standard fields and optional custom fields', async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        requiresBookerEmailVerification: false,
        bookingRequiresAuthentication: false,
        recurrence: null,
        bookingFields: [
          { slug: 'name', required: true, isDefault: true },
          { slug: 'email', required: true, isDefault: true },
          { slug: 'company', required: false, isDefault: false },
        ],
      },
    })

    await expect(getCalcomBookingCompatibility(42)).resolves.toEqual({
      compatible: true,
      reasons: [],
    })
  })
})

describe('Cal.com booking details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes Cal.com's blank API cancellation actor to missing attribution", async () => {
    mocks.calcomRequest.mockResolvedValue({
      status: 'success',
      data: {
        uid: 'booking-uid',
        status: 'cancelled',
        start: '2099-01-02T15:00:00.000Z',
        end: '2099-01-02T15:30:00.000Z',
        duration: 30,
        cancelledByEmail: '',
        hosts: [],
        attendees: [],
        metadata: {},
      },
    })

    await expect(getCalcomBooking('booking-uid')).resolves.toMatchObject({
      cancelledByEmail: undefined,
    })
  })
})
