import { z } from 'zod'

export const CalcomBookingPayloadSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  additionalNotes: z.string().optional(),
  customInputs: z.record(z.any()).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  organizer: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    username: z.string(),
    timeZone: z.string(),
    language: z
      .object({
        locale: z.string(),
      })
      .optional(),
    timeFormat: z.string().optional(),
  }),
  responses: z.record(z.any()),
  userFieldsResponses: z.record(z.any()).optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().email(),
        phoneNumber: z
          .string()
          .trim()
          .optional()
          .refine(val => !val || /^\+?[0-9\s\-()]{7,20}$/.test(val), {
            message: 'Phone number must be a valid international phone number',
          }),
        name: z.string(),
        timeZone: z.string(),
        language: z
          .object({
            locale: z.string(),
          })
          .optional(),
      })
    )
    .nonempty('At least one attendee is required'),
  location: z.string(),
  destinationCalendar: z
    .object({
      id: z.number(),
      integration: z.string(),
      externalId: z.string().url(),
      userId: z.number(),
      eventTypeId: z.number().nullable(),
      credentialId: z.number(),
    })
    .nullable(),
  hideCalendarNotes: z.boolean().optional(),
  requiresConfirmation: z.boolean().nullable().optional(),
  eventTypeId: z.number(),
  seatsShowAttendees: z.boolean().optional(),
  seatsPerTimeSlot: z.number().nullable().optional(),
  uid: z.string(),
  appsStatus: z
    .array(
      z.object({
        appName: z.string(),
        type: z.string(),
        success: z.number(),
        failures: z.number(),
        errors: z.array(z.any()).optional(),
        warnings: z.array(z.any()).optional(),
      })
    )
    .optional(),
  eventTitle: z.string().optional(),
  eventDescription: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  length: z
    .number()
    .int()
    .positive('Length must be a positive integer')
    .max(60, 'Length cannot exceed 60 minutes'),
  bookingId: z.number(),
  metadata: z.object({
    videoCallUrl: z.string().url().optional(),
    paymentId: z.string().optional(),
    mentorUserId: z.string().uuid('Mentor user ID must be a valid UUID'),
    actorUserId: z.string().uuid('Actor user ID must be a valid UUID').optional(),
  }),
  status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED']),
})

export type CalcomBookingPayload = z.infer<typeof CalcomBookingPayloadSchema>

export const CalcomNoShowPayloadSchema = z.object({
  title: z.string(),
  bookingId: z.number(),
  bookingUid: z.string(),
  startTime: z.string().datetime(),
  attendees: z.array(z.object({ email: z.string().email(), name: z.string() })),
  endTime: z.string().datetime(),
  participants: z.array(z.object({ email: z.string().email(), name: z.string() })),
  hostEmail: z.string().email().optional(), // Optional for guest no-show events
  eventType: z.object({
    id: z.number(),
    teamId: z.number().nullable(),
    parentId: z.number().nullable(),
  }),
  webhook: z.object({
    id: z.string(),
    subscriberUrl: z.string().url(),
    appId: z.string().nullable(),
    time: z.number(),
    timeUnit: z.string(),
    eventTriggers: z.array(z.string()),
    payloadTemplate: z.string().nullable(),
  }),
  message: z.string(),
})
export const CalcomBookingCancelledPayloadSchema = CalcomBookingPayloadSchema.extend({
  cancellationReason: z.string().optional(),
})

// Generic payload for events we haven't strictly typed yet
const CalcomUnknownPayloadSchema = z.record(z.any())

export const CalcomWebhookSchema = z.discriminatedUnion('triggerEvent', [
  z.object({
    triggerEvent: z.literal('BOOKING_CREATED'),
    createdAt: z.string(),
    payload: CalcomBookingPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('AFTER_GUESTS_CAL_VIDEO_NO_SHOW'),
    createdAt: z.string(),
    payload: CalcomNoShowPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('AFTER_HOSTS_CAL_VIDEO_NO_SHOW'),
    createdAt: z.string(),
    payload: CalcomNoShowPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('BOOKING_CANCELLED'),
    createdAt: z.string(),
    payload: CalcomBookingCancelledPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('RECORDING_TRANSCRIPTION_GENERATED'),
    createdAt: z.string(),
    payload: CalcomUnknownPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('RECORDING_READY'),
    createdAt: z.string(),
    payload: CalcomUnknownPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('MEETING_STARTED'),
    createdAt: z.string(),
    payload: CalcomUnknownPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('MEETING_ENDED'),
    createdAt: z.string(),
    payload: CalcomBookingPayloadSchema.optional(), // Payload can be undefined
  }),
])

export type CalcomWebhookEvent = z.infer<typeof CalcomWebhookSchema>
