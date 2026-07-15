import { describe, expect, it } from 'vitest'
import {
  CalcomBookingPayloadSchema,
  CalcomNoShowPayloadSchema,
  CalcomWebhookEnvelopeSchema,
} from '~/lib/schemas/calcom'
import { booking } from '~/server/db/schema'

const mentorUserId = '11111111-1111-4111-8111-111111111111'
const meetingUrlWithLength = (length: number) => {
  const prefix = 'https://meet.example.com/'
  return `${prefix}${'a'.repeat(length - prefix.length)}`
}

const currentBookingPayload = {
  type: 'standard-event-type',
  title: 'Strategy Session between Organizer and Guest',
  description: null,
  additionalNotes: null,
  customInputs: {},
  startTime: '2026-07-14T14:00:00.000Z',
  endTime: '2026-07-14T14:30:00.000Z',
  organizer: {
    id: 1,
    name: 'Organizer Name',
    email: 'organizer@example.com',
    username: 'organizer-handle',
    timeZone: 'UTC',
    timeFormat: 12,
  },
  responses: {},
  attendees: [
    {
      email: 'guest@example.com',
      phoneNumber: null,
      name: 'Guest User',
      timeZone: 'UTC',
    },
  ],
  location: null,
  destinationCalendar: [],
  eventTypeId: 123,
  uid: 'cal-booking-uid',
  eventDescription: null,
  price: null,
  length: 30,
  bookingId: 456,
  metadata: {
    videoCallUrl: null,
    mentorUserId,
    futureCalField: 'preserved',
  },
  status: 'ACCEPTED',
  futurePayloadField: { retained: true },
}

describe('Cal.com webhook schemas', () => {
  it('accepts current nullable booking fields and preserves unknown fields', () => {
    const result = CalcomBookingPayloadSchema.parse(currentBookingPayload)

    expect(result.description).toBeUndefined()
    expect(result.attendees[0]?.phoneNumber).toBeUndefined()
    expect(result.metadata.futureCalField).toBe('preserved')
    expect(result.futurePayloadField).toEqual({ retained: true })
  })

  it.each(['33333333-3333-4333-8333-333333333333', 'a'.repeat(64)])(
    'accepts current and rollout booking-attempt metadata: %s',
    bookingAttemptId => {
      const result = CalcomBookingPayloadSchema.parse({
        ...currentBookingPayload,
        metadata: {
          ...currentBookingPayload.metadata,
          bookingAttemptId,
        },
      })

      expect(result.metadata.bookingAttemptId).toBe(bookingAttemptId)
    }
  )

  it('accepts Cal.com meeting URLs through the 2048-character storage contract', () => {
    const videoCallUrl = meetingUrlWithLength(2_048)
    const result = CalcomBookingPayloadSchema.parse({
      ...currentBookingPayload,
      metadata: { ...currentBookingPayload.metadata, videoCallUrl },
    })

    expect(result.metadata.videoCallUrl).toBe(videoCallUrl)
    expect(videoCallUrl).toHaveLength(2_048)
  })

  it('rejects a meeting URL that cannot fit the local storage contract', () => {
    const videoCallUrl = meetingUrlWithLength(2_049)

    expect(
      CalcomBookingPayloadSchema.safeParse({
        ...currentBookingPayload,
        metadata: { ...currentBookingPayload.metadata, videoCallUrl },
      }).success
    ).toBe(false)
  })

  it('keeps the booking column aligned with the validated meeting URL contract', () => {
    expect(booking.meetingUrl.getSQLType()).toBe('varchar(2048)')
  })

  it('accepts flat meeting events without a nested payload', () => {
    const result = CalcomWebhookEnvelopeSchema.parse({
      triggerEvent: 'MEETING_ENDED',
      uid: 'cal-booking-uid',
      metadata: { mentorUserId },
    })

    expect(result.triggerEvent).toBe('MEETING_ENDED')
    expect(result.payload).toBeUndefined()
  })

  it('accepts current Cal Video no-show attendee fields', () => {
    const result = CalcomNoShowPayloadSchema.parse({
      title: 'Strategy Session',
      bookingId: 456,
      bookingUid: 'cal-booking-uid',
      startTime: '2026-07-14T14:00:00.000Z',
      endTime: '2026-07-14T14:30:00.000Z',
      attendees: [
        {
          id: 5,
          email: 'guest@example.com',
          name: 'Guest User',
          phoneNumber: null,
          noShow: true,
        },
      ],
      participants: [],
      hostEmail: 'organizer@example.com',
      eventType: { id: 123, teamId: null, parentId: null },
      webhook: {
        id: 'webhook-id',
        subscriberUrl: 'https://discuno.com/api/webhooks/cal',
        appId: null,
        time: 5,
        timeUnit: 'MINUTE',
        eventTriggers: ['AFTER_HOSTS_CAL_VIDEO_NO_SHOW'],
        payloadTemplate: null,
      },
      message: 'Host did not join',
    })

    expect(result.bookingUid).toBe('cal-booking-uid')
  })
})
