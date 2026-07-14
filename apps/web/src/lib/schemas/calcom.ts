import { z } from 'zod'

export const CalcomBookingPayloadSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    description: z
      .string()
      .nullish()
      .transform(value => value ?? undefined),
    additionalNotes: z
      .string()
      .nullish()
      .transform(value => value ?? undefined),
    customInputs: z.record(z.string(), z.any()).optional(),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    organizer: z.object({
      id: z.number(),
      name: z.string(),
      email: z.email(),
      username: z.string(),
      timeZone: z.string(),
      language: z
        .object({
          locale: z.string(),
        })
        .optional(),
      timeFormat: z.union([z.string(), z.number()]).optional(),
    }),
    responses: z.record(z.string(), z.any()),
    userFieldsResponses: z.record(z.string(), z.any()).optional(),
    attendees: z
      .array(
        z.object({
          email: z.email(),
          phoneNumber: z
            .string()
            .trim()
            .nullish()
            .refine(val => !val || /^\+?[0-9\s\-()]{7,20}$/.test(val), {
              message: 'Phone number must be a valid international phone number',
            })
            .transform(value => value ?? undefined),
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
    location: z.unknown().optional(),
    destinationCalendar: z.unknown().nullable().optional(),
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
    eventDescription: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    currency: z.string().optional(),
    length: z
      .number()
      .int()
      .positive('Length must be a positive integer')
      .max(24 * 60, 'Length cannot exceed 24 hours'),
    bookingId: z.number(),
    metadata: z
      .object({
        videoCallUrl: z
          .url()
          .nullish()
          .transform(value => value ?? undefined),
        paymentId: z.string().optional(),
        mentorUserId: z.uuid({ error: 'Mentor user ID must be a valid UUID' }),
        actorUserId: z.uuid({ error: 'Actor user ID must be a valid UUID' }).optional(),
      })
      .passthrough(),
    status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED']),
  })
  .passthrough()

export type CalcomBookingPayload = z.infer<typeof CalcomBookingPayloadSchema>

export const CalcomNoShowPayloadSchema = z.object({
  title: z.string(),
  bookingId: z.number(),
  bookingUid: z.string(),
  startTime: z.iso.datetime(),
  attendees: z.array(z.object({ email: z.email(), name: z.string() })),
  endTime: z.iso.datetime(),
  participants: z.array(z.object({ email: z.email(), name: z.string() })),
  hostEmail: z.email().optional(), // Optional for guest no-show events
  eventType: z.object({
    id: z.number(),
    teamId: z.number().nullable(),
    parentId: z.number().nullable(),
  }),
  webhook: z.object({
    id: z.string(),
    subscriberUrl: z.url(),
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

export const CalcomBookingRescheduledPayloadSchema = CalcomBookingPayloadSchema.extend({
  rescheduleId: z.number().optional(),
  rescheduleUid: z.string(),
  rescheduleStartTime: z.iso.datetime().optional(),
  rescheduleEndTime: z.iso.datetime().optional(),
})

export const CalcomNoShowUpdatedPayloadSchema = z.object({
  message: z.string(),
  attendees: z.array(
    z.object({
      email: z.email(),
      noShow: z.boolean(),
    })
  ),
  bookingUid: z.string(),
  bookingId: z.number(),
})

export const CalcomWebhookEnvelopeSchema = z.object({
  triggerEvent: z.string(),
  createdAt: z.string().optional(),
  payload: z.unknown().optional(),
})

// Generic payload for events we haven't strictly typed yet
const CalcomUnknownPayloadSchema = z.record(z.string(), z.any())

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
    triggerEvent: z.literal('BOOKING_RESCHEDULED'),
    createdAt: z.string(),
    payload: CalcomBookingRescheduledPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('BOOKING_NO_SHOW_UPDATED'),
    createdAt: z.string(),
    payload: CalcomNoShowUpdatedPayloadSchema,
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
