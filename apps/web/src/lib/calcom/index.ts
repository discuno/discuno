import 'server-only'

import { z } from 'zod'
import { CALCOM_API_VERSIONS, calcomRequest } from '~/lib/calcom/client'
import {
  CalcomSafeMeetingUrlSchema,
  GetCalcomSchedulesResponseSchema,
  type CalcomSchedule,
} from '~/lib/calcom/schemas'
import { ExternalApiError } from '~/lib/errors'

const SuccessResponseSchema = z.object({ status: z.literal('success') })

const CalcomOptionalEmailSchema = z.preprocess(
  value => (typeof value === 'string' ? value.trim() || undefined : value),
  z.email().nullish()
)

const CalcomEventTypeLocationSchema = z
  .object({
    type: z.string().trim().min(1),
  })
  .passthrough()

const CalcomBookingLookupSchema = z.object({
  status: z.literal('success'),
  data: z.array(
    z.object({
      id: z.number().int(),
      uid: z.string(),
      status: z.string(),
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    })
  ),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
})

const MAX_CALCOM_BOOKING_RECONCILIATION_PAGES = 10
const TERMINAL_CALCOM_BOOKING_STATUSES = new Set(['cancelled', 'rejected'])

export type CalcomBookingIdentity = {
  id: number
  uid: string
  start: string
  end: string
  duration: number
  meetingUrl?: string | null
  rescheduledFromUid?: string | null
}

const CalcomEventTypeCompatibilityDataSchema = z.object({
  lengthInMinutes: z.number().int().positive(),
  requiresBookerEmailVerification: z.boolean(),
  bookingRequiresAuthentication: z.boolean(),
  price: z.number().nonnegative(),
  currency: z.string().trim().min(1),
  locations: z.array(CalcomEventTypeLocationSchema),
  isInstantEvent: z.boolean().default(false),
  seatsPerTimeSlot: z.number().int().positive().nullish(),
  seats: z
    .object({ seatsPerTimeSlot: z.number().int().positive().optional() })
    .passthrough()
    .nullish(),
  recurrence: z.union([z.null(), z.object({ disabled: z.boolean().optional() }).passthrough()]),
  confirmationPolicy: z.record(z.string(), z.unknown()),
  bookingFields: z.array(
    z.object({
      slug: z.string(),
      required: z.boolean(),
      isDefault: z.boolean(),
    })
  ),
})

const CalcomEventTypeBookingCompatibilitySchema = z.object({
  status: z.literal('success'),
  data: CalcomEventTypeCompatibilityDataSchema,
})

// Discuno's checkout always supplies these two required fields. Any other
// required Cal.com booking question must fail closed until the Discuno form
// explicitly captures and forwards a response for it.
const SUPPORTED_REQUIRED_CALCOM_BOOKING_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'attendeePhoneNumber',
])
const BOOKER_SUPPLIED_LOCATION_TYPES = new Set([
  'attendeeaddress',
  'attendee-address',
  'attendee_address',
  'attendeephone',
  'attendee-phone',
  'attendee_phone',
  'attendeedefined',
  'attendee-defined',
  'attendee_defined',
  // `unknown` is an event-type output placeholder, not a valid create-booking
  // input. Never forward it into a paid booking attempt.
  'unknown',
])

export type CalcomBookingCompatibilityReason =
  | 'email_verification_required'
  | 'cal_authentication_required'
  | 'recurring_event_type'
  | 'requires_confirmation'
  | 'unsupported_required_booking_fields'
  | 'instant_event_type'
  | 'seated_event_type'
  | 'cal_managed_payment'
  | 'location_selection_required'
  | 'booker_location_required'

export type CalcomBookingCompatibility = {
  compatible: boolean
  reasons: CalcomBookingCompatibilityReason[]
}

const assessCalcomBookingCompatibility = (
  data: z.infer<typeof CalcomEventTypeCompatibilityDataSchema>
): CalcomBookingCompatibility => {
  const reasons: CalcomBookingCompatibilityReason[] = []

  if (data.requiresBookerEmailVerification) reasons.push('email_verification_required')
  if (data.bookingRequiresAuthentication) reasons.push('cal_authentication_required')
  if (data.isInstantEvent) reasons.push('instant_event_type')
  if (data.seatsPerTimeSlot || data.seats?.seatsPerTimeSlot) reasons.push('seated_event_type')
  if (data.price > 0) reasons.push('cal_managed_payment')
  if (data.locations.length > 1) reasons.push('location_selection_required')
  if (
    data.locations.some(location => BOOKER_SUPPLIED_LOCATION_TYPES.has(location.type.toLowerCase()))
  ) {
    reasons.push('booker_location_required')
  }
  if (data.recurrence && data.recurrence.disabled !== true) reasons.push('recurring_event_type')
  if (data.confirmationPolicy.disabled !== true) reasons.push('requires_confirmation')
  if (
    data.bookingFields.some(
      field =>
        field.required &&
        !(field.isDefault && SUPPORTED_REQUIRED_CALCOM_BOOKING_FIELDS.has(field.slug))
    )
  ) {
    reasons.push('unsupported_required_booking_fields')
  }

  return { compatible: reasons.length === 0, reasons }
}

/**
 * Discuno's custom checkout currently supplies Cal.com's standard attendee fields.
 * Reject incompatible event types before a booking attempt (and, critically, before
 * creating a paid Checkout Session) instead of charging for an unfulfillable booking.
 */
export const getCalcomBookingCompatibility = async (
  eventTypeId: number,
  mentorUserId: string
): Promise<{ compatible: boolean; reasons: CalcomBookingCompatibilityReason[] }> => {
  return (await getCalcomBookingConfiguration(eventTypeId, mentorUserId)).compatibility
}

const getCalcomBookingConfiguration = async (eventTypeId: number, mentorUserId: string) => {
  const response = await calcomRequest<unknown>(`/event-types/${eventTypeId}`, {
    apiVersion: CALCOM_API_VERSIONS.eventTypes,
    userId: mentorUserId,
  })
  const { data } = CalcomEventTypeBookingCompatibilitySchema.parse(response)
  return {
    compatibility: assessCalcomBookingCompatibility(data),
    lengthInMinutes: data.lengthInMinutes,
    location: data.locations.length === 1 ? data.locations[0] : undefined,
  }
}

/** Reconcile an ambiguous create response using unique Discuno metadata. */
const findCalcomBookingByMetadata = async ({
  metadataKey,
  metadataValue,
  attendeeEmail,
  eventTypeId,
  mentorUserId,
}: {
  metadataKey: 'paymentId' | 'bookingAttemptId'
  metadataValue: string
  attendeeEmail: string
  eventTypeId: number
  mentorUserId: string
}): Promise<(CalcomBookingIdentity & { status: string }) | null> => {
  let cursor: string | null = null

  for (let page = 0; page < MAX_CALCOM_BOOKING_RECONCILIATION_PAGES; page += 1) {
    const query = new URLSearchParams({
      attendeeEmail,
      eventTypeId: eventTypeId.toString(),
      limit: '100',
    })
    if (cursor) query.set('cursor', cursor)

    const response = await calcomRequest<unknown>(`/bookings?${query}`, {
      apiVersion: CALCOM_API_VERSIONS.bookingList,
      userId: mentorUserId,
    })
    const parsed = CalcomBookingLookupSchema.parse(response)
    const match = parsed.data.find(item => item.metadata[metadataKey] === metadataValue)
    if (match) {
      if (TERMINAL_CALCOM_BOOKING_STATUSES.has(match.status.toLowerCase())) {
        throw new ExternalApiError('A matching Cal.com booking is already in a terminal state')
      }
      const duration =
        (new Date(match.end).getTime() - new Date(match.start).getTime()) / (60 * 1000)
      if (!Number.isSafeInteger(duration) || duration <= 0) {
        throw new ExternalApiError('A matching Cal.com booking has an invalid duration')
      }
      return { ...match, duration }
    }

    if (!parsed.pagination.hasMore) return null
    if (!parsed.pagination.nextCursor || parsed.pagination.nextCursor === cursor) {
      throw new ExternalApiError('Cal.com returned an invalid booking pagination cursor')
    }
    cursor = parsed.pagination.nextCursor
  }

  // A bounded scan must fail closed. Posting after an incomplete reconciliation
  // could create a duplicate booking beyond the scanned window.
  throw new ExternalApiError('Cal.com booking reconciliation exceeded its safe page limit')
}

export const findCalcomBookingByPaymentId = async ({
  paymentId,
  attendeeEmail,
  eventTypeId,
  mentorUserId,
}: {
  paymentId: number
  attendeeEmail: string
  eventTypeId: number
  mentorUserId: string
}) =>
  findCalcomBookingByMetadata({
    metadataKey: 'paymentId',
    metadataValue: paymentId.toString(),
    attendeeEmail,
    eventTypeId,
    mentorUserId,
  })

/** Create a booking for the connected mentor. Paid retries first reconcile by payment ID. */
export const createCalcomBooking = async (input: {
  calcomEventTypeId: number
  start: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  timeZone: string
  paymentId?: number
  mentorUserId: string
  actorUserId?: string
  bookingAttemptId?: string
  lengthInMinutes?: number
  /** A prior POST crossed the network boundary; a miss is reconciliation-only. */
  providerMutationMayBeInFlight?: boolean
  onBeforeCreateAttempt?: () => Promise<void>
  onDefinitiveCreateRejection?: () => Promise<void>
}): Promise<CalcomBookingIdentity> => {
  const attendeePhone = input.attendeePhone?.trim()
  const reconciliationKey = input.paymentId
    ? { metadataKey: 'paymentId' as const, metadataValue: input.paymentId.toString() }
    : input.bookingAttemptId
      ? { metadataKey: 'bookingAttemptId' as const, metadataValue: input.bookingAttemptId }
      : null
  if (reconciliationKey) {
    const existing = await findCalcomBookingByMetadata({
      ...reconciliationKey,
      attendeeEmail: input.attendeeEmail,
      eventTypeId: input.calcomEventTypeId,
      mentorUserId: input.mentorUserId,
    })
    if (existing) {
      if (new Date(existing.start).toISOString() !== new Date(input.start).toISOString()) {
        throw new ExternalApiError('A matching Cal.com booking has conflicting schedule details')
      }
      if (
        input.lengthInMinutes !== undefined &&
        new Date(existing.end).getTime() - new Date(existing.start).getTime() !==
          input.lengthInMinutes * 60 * 1000
      ) {
        throw new ExternalApiError('A matching Cal.com booking has a conflicting duration')
      }
      return existing
    }
  }

  if (input.providerMutationMayBeInFlight) {
    throw new ExternalApiError(
      'A prior Cal.com booking create attempt still requires provider reconciliation'
    )
  }

  const configuration = await getCalcomBookingConfiguration(
    input.calcomEventTypeId,
    input.mentorUserId
  )
  const { compatibility } = configuration
  if (!compatibility.compatible) {
    throw new ExternalApiError(
      `Cal.com event type is incompatible with Discuno booking: ${compatibility.reasons.join(', ')}`
    )
  }
  if (
    input.lengthInMinutes !== undefined &&
    configuration.lengthInMinutes !== input.lengthInMinutes
  ) {
    throw new ExternalApiError('The Cal.com event duration changed before booking')
  }

  const createAttemptState = { marked: false }
  let response: unknown
  try {
    response = await calcomRequest<unknown>('/bookings', {
      method: 'POST',
      apiVersion: CALCOM_API_VERSIONS.bookings,
      userId: input.mentorUserId,
      onBeforeRequest: input.onBeforeCreateAttempt
        ? async () => {
            await input.onBeforeCreateAttempt?.()
            createAttemptState.marked = true
          }
        : undefined,
      body: JSON.stringify({
        start: input.start,
        attendee: {
          name: input.attendeeName,
          email: input.attendeeEmail,
          ...(attendeePhone ? { phoneNumber: attendeePhone } : {}),
          timeZone: input.timeZone,
          language: 'en',
        },
        eventTypeId: input.calcomEventTypeId,
        ...(input.lengthInMinutes !== undefined ? { lengthInMinutes: input.lengthInMinutes } : {}),
        ...(configuration.location ? { location: configuration.location } : {}),
        metadata: {
          ...(input.paymentId !== undefined ? { paymentId: input.paymentId.toString() } : {}),
          mentorUserId: input.mentorUserId,
          ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
          ...(input.bookingAttemptId ? { bookingAttemptId: input.bookingAttemptId } : {}),
        },
      }),
    })
  } catch (error) {
    const providerStatus = error instanceof ExternalApiError ? error.providerStatus : undefined
    const isDefinitiveProviderRejection =
      createAttemptState.marked &&
      typeof providerStatus === 'number' &&
      providerStatus >= 400 &&
      providerStatus < 500 &&
      providerStatus !== 408
    if (isDefinitiveProviderRejection) {
      await input.onDefinitiveCreateRejection?.()
    }
    throw error
  }
  const parsed = z
    .object({
      status: z.literal('success'),
      data: z.object({
        id: z.number().int(),
        uid: z.string(),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
        duration: z.number().int().positive(),
        meetingUrl: CalcomSafeMeetingUrlSchema,
      }),
    })
    .parse(response)
  if (new Date(parsed.data.start).toISOString() !== new Date(input.start).toISOString()) {
    throw new ExternalApiError('Cal.com created the booking at an unexpected start time')
  }
  if (
    input.lengthInMinutes !== undefined &&
    (parsed.data.duration !== input.lengthInMinutes ||
      new Date(parsed.data.end).getTime() - new Date(parsed.data.start).getTime() !==
        input.lengthInMinutes * 60 * 1000)
  ) {
    throw new ExternalApiError('Cal.com created the booking with an unexpected duration')
  }
  return parsed.data
}

/** Fetch event types for the connected regular Cal.com account. */
export const fetchCalcomEventTypesForUser = async (
  userId: string,
  options: { accessToken?: string } = {}
): Promise<
  Array<{
    id: number
    title: string
    lengthInMinutes: number
    description?: string
    bookingCompatibility: CalcomBookingCompatibility
  }>
> => {
  const response = await calcomRequest<unknown>('/event-types', {
    apiVersion: CALCOM_API_VERSIONS.eventTypes,
    ...(options.accessToken ? { accessToken: options.accessToken } : { userId }),
  })
  const parsed = z
    .object({
      status: z.literal('success'),
      data: z.array(
        z
          .object({
            id: z.number().int(),
            title: z.string(),
            lengthInMinutes: z.number().int(),
            description: z.string().nullable().optional(),
          })
          .extend(CalcomEventTypeCompatibilityDataSchema.shape)
      ),
    })
    .parse(response)

  return parsed.data.map(eventType => ({
    id: eventType.id,
    title: eventType.title,
    lengthInMinutes: eventType.lengthInMinutes,
    description: eventType.description ?? undefined,
    bookingCompatibility: assessCalcomBookingCompatibility(eventType),
  }))
}

export const getCalcomSchedules = async (userId: string): Promise<CalcomSchedule[]> => {
  const response = await calcomRequest<unknown>('/schedules', {
    apiVersion: CALCOM_API_VERSIONS.schedules,
    userId,
  })
  return GetCalcomSchedulesResponseSchema.parse(response).data
}

export const updateCalcomSchedule = async (
  userId: string,
  scheduleId: number,
  payload: Pick<CalcomSchedule, 'availability' | 'overrides'>
): Promise<void> => {
  const response = await calcomRequest<unknown>(`/schedules/${scheduleId}`, {
    method: 'PATCH',
    apiVersion: CALCOM_API_VERSIONS.schedules,
    userId,
    body: JSON.stringify(payload),
  })
  SuccessResponseSchema.parse(response)
}

export const cancelCalcomBooking = async (
  mentorUserId: string,
  bookingUid: string,
  cancellationReason: string
): Promise<void> => {
  const response = await calcomRequest<unknown>(`/bookings/${bookingUid}/cancel`, {
    method: 'POST',
    apiVersion: CALCOM_API_VERSIONS.bookings,
    userId: mentorUserId,
    body: JSON.stringify({ cancellationReason }),
  })
  SuccessResponseSchema.parse(response)
}

const CalcomBookingDetailsSchema = z.object({
  id: z.number().int().positive(),
  uid: z.string(),
  status: z.string(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  duration: z.number().int().positive(),
  eventTypeId: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
  rescheduledFromUid: z.string().nullish(),
  rescheduledToUid: z.string().nullish(),
  absentHost: z.boolean().default(false),
  cancelledByEmail: CalcomOptionalEmailSchema,
  hosts: z
    .array(
      z
        .object({
          id: z.number().int().optional(),
          name: z.string().optional(),
          email: z.email(),
          username: z.string().optional(),
          timeZone: z.string().optional(),
        })
        .passthrough()
    )
    .default([]),
  attendees: z
    .array(
      z
        .object({
          name: z.string().optional(),
          email: z.email(),
          timeZone: z.string().optional(),
          phoneNumber: z.string().nullish(),
          absent: z.boolean().default(false),
        })
        .passthrough()
    )
    .default([]),
  title: z.string().optional(),
  description: z.string().nullish(),
  meetingUrl: CalcomSafeMeetingUrlSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type CalcomBookingDetails = z.infer<typeof CalcomBookingDetailsSchema>

/** Fetch the current Cal.com booking state, including cancellation attribution. */
export const getCalcomBooking = async (bookingUid: string, mentorUserId: string) => {
  const response = await calcomRequest<unknown>(`/bookings/${bookingUid}`, {
    apiVersion: CALCOM_API_VERSIONS.bookings,
    userId: mentorUserId,
  })
  const parsed = z
    .object({
      status: z.literal('success'),
      data: z.union([CalcomBookingDetailsSchema, z.array(CalcomBookingDetailsSchema)]),
    })
    .parse(response)
  const booking = Array.isArray(parsed.data)
    ? parsed.data.find(item => item.uid === bookingUid)
    : parsed.data
  if (!booking) throw new ExternalApiError('Cal.com booking was not found')
  return booking
}
