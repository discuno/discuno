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
    stripePaymentIntentId: z.string().min(1, 'Stripe payment intent ID is required'),
    paymentId: z.string().optional(),
    mentorUserId: z.string().uuid('Mentor user ID must be a valid UUID'),
  }),
  status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED']),
})

export type CalcomBookingPayload = z.infer<typeof CalcomBookingPayloadSchema>

export const CalcomWebhookSchema = z.object({
  triggerEvent: z.string(),
  createdAt: z.string(),
  payload: CalcomBookingPayloadSchema,
})

export type CalcomWebhookEvent = z.infer<typeof CalcomWebhookSchema>
