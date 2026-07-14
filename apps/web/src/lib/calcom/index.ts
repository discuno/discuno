import 'server-only'

import { z } from 'zod'
import { env } from '~/env'
import { CALCOM_API_VERSIONS, calcomRequest } from '~/lib/calcom/client'
import {
  CreateCalcomUserResponseSchema,
  GetCalcomSchedulesResponseSchema,
  type CalcomSchedule,
  type CreateCalcomUserInput,
  type UpdateCalcomUserInput,
} from '~/lib/calcom/schemas'
import { ExternalApiError } from '~/lib/errors'
import { storeCalcomConnectionForUser } from '~/lib/services/calcom-tokens-service'

const SuccessResponseSchema = z.object({ status: z.literal('success') })

/** Create a user in the Discuno Cal.com organization and mentor team. */
export const createCalcomUser = async (
  data: CreateCalcomUserInput
): Promise<{ calcomUserId: number; username: string }> => {
  const { userId, email, name, timeZone, timeFormat, weekStart, ...optional } = data
  const response = await calcomRequest<unknown>(`/organizations/${env.CALCOM_ORG_ID}/users`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      name,
      timeZone,
      timeFormat: timeFormat ? Number(timeFormat) : 12,
      weekday: weekStart ?? 'Sunday',
      organizationRole: 'MEMBER',
      autoAccept: true,
      skipNotificationEmail: true,
      ...optional,
    }),
  })
  const parsed = CreateCalcomUserResponseSchema.parse(response)
  const calcomUserId = parsed.data.id
  const username = parsed.data.profile.username ?? parsed.data.username

  if (!username) {
    throw new ExternalApiError('Cal.com did not assign an organization username')
  }

  try {
    const membership = await calcomRequest<unknown>(
      `/organizations/${env.CALCOM_ORG_ID}/teams/${env.COLLEGE_MENTOR_TEAM_ID}/memberships`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: 'MEMBER',
          accepted: true,
          disableImpersonation: false,
          userId: calcomUserId,
        }),
      }
    )
    SuccessResponseSchema.parse(membership)
  } catch (error) {
    // Avoid leaving a partially provisioned organization user when team setup fails.
    await calcomRequest<unknown>(`/organizations/${env.CALCOM_ORG_ID}/users/${calcomUserId}`, {
      method: 'DELETE',
    }).catch(cleanupError => {
      console.error('Failed to roll back Cal.com organization user', {
        calcomUserId,
        cleanupError,
      })
    })
    throw error
  }

  await storeCalcomConnectionForUser({
    userId,
    calcomUserId,
    calcomUsername: username,
    accessToken: null,
    refreshToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  })

  return { calcomUserId, username }
}

/** Update a user through the supported organization API. */
export const updateCalcomUser = async (data: UpdateCalcomUserInput): Promise<void> => {
  const { calcomUserId, userId: _userId, timeFormat, weekStart, ...rest } = data
  const response = await calcomRequest<unknown>(
    `/organizations/${env.CALCOM_ORG_ID}/users/${calcomUserId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...rest,
        ...(timeFormat ? { timeFormat: Number(timeFormat) } : {}),
        ...(weekStart ? { weekday: weekStart } : {}),
      }),
    }
  )
  CreateCalcomUserResponseSchema.parse(response)
}

/** Delete a user through the supported organization API. */
export const deleteCalcomUser = async (calcomUserId: number): Promise<void> => {
  const response = await calcomRequest<unknown>(
    `/organizations/${env.CALCOM_ORG_ID}/users/${calcomUserId}`,
    { method: 'DELETE' }
  )
  CreateCalcomUserResponseSchema.parse(response)
}

const CalcomBookingLookupSchema = z.object({
  status: z.literal('success'),
  data: z.array(
    z.object({
      id: z.number().int(),
      uid: z.string(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    })
  ),
})

/** Reconcile an ambiguous create response using unique Discuno metadata. */
const findCalcomBookingByMetadata = async ({
  metadataKey,
  metadataValue,
  attendeeEmail,
  eventTypeId,
}: {
  metadataKey: 'paymentId' | 'bookingAttemptId'
  metadataValue: string
  attendeeEmail: string
  eventTypeId: number
}): Promise<{ id: number; uid: string } | null> => {
  const query = new URLSearchParams({
    attendeeEmail,
    eventTypeId: eventTypeId.toString(),
    afterCreatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    limit: '100',
  })
  const response = await calcomRequest<unknown>(`/bookings?${query}`, {
    apiVersion: CALCOM_API_VERSIONS.bookingList,
  })
  const parsed = CalcomBookingLookupSchema.parse(response)
  const match = parsed.data.find(item => item.metadata[metadataKey] === metadataValue)
  return match ? { id: match.id, uid: match.uid } : null
}

export const findCalcomBookingByPaymentId = async ({
  paymentId,
  attendeeEmail,
  eventTypeId,
}: {
  paymentId: number
  attendeeEmail: string
  eventTypeId: number
}) =>
  findCalcomBookingByMetadata({
    metadataKey: 'paymentId',
    metadataValue: paymentId.toString(),
    attendeeEmail,
    eventTypeId,
  })

/** Create a booking with platform credentials. Paid retries first reconcile by payment ID. */
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
}): Promise<{ id: number; uid: string }> => {
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
    })
    if (existing) return existing
  }

  const response = await calcomRequest<unknown>('/bookings', {
    method: 'POST',
    apiVersion: CALCOM_API_VERSIONS.bookings,
    body: JSON.stringify({
      start: input.start,
      attendee: {
        name: input.attendeeName,
        email: input.attendeeEmail,
        phoneNumber: input.attendeePhone,
        timeZone: input.timeZone,
        language: 'en',
      },
      eventTypeId: input.calcomEventTypeId,
      metadata: {
        paymentId: input.paymentId?.toString() ?? '',
        mentorUserId: input.mentorUserId,
        actorUserId: input.actorUserId,
        bookingAttemptId: input.bookingAttemptId,
      },
    }),
  })
  const parsed = z
    .object({
      status: z.literal('success'),
      data: z.object({ id: z.number().int(), uid: z.string() }),
    })
    .parse(response)
  return parsed.data
}

/** Fetch event types without relying on deprecated managed-user tokens. */
export const fetchCalcomEventTypesByUsername = async (
  username: string
): Promise<Array<{ id: number; title: string; lengthInMinutes: number; description?: string }>> => {
  const query = new URLSearchParams({ username })
  const response = await calcomRequest<unknown>(`/event-types?${query}`, {
    apiVersion: CALCOM_API_VERSIONS.eventTypes,
  })
  const parsed = z
    .object({
      status: z.literal('success'),
      data: z.array(
        z.object({
          id: z.number().int(),
          title: z.string(),
          lengthInMinutes: z.number().int(),
          description: z.string().nullable().optional(),
        })
      ),
    })
    .parse(response)

  return parsed.data.map(eventType => ({
    ...eventType,
    description: eventType.description ?? undefined,
  }))
}

export const getCalcomSchedules = async (calcomUserId: number): Promise<CalcomSchedule[]> => {
  const response = await calcomRequest<unknown>(
    `/organizations/${env.CALCOM_ORG_ID}/users/${calcomUserId}/schedules`,
    { apiVersion: CALCOM_API_VERSIONS.schedules }
  )
  return GetCalcomSchedulesResponseSchema.parse(response).data
}

export const updateCalcomSchedule = async (
  calcomUserId: number,
  scheduleId: number,
  payload: Pick<CalcomSchedule, 'availability' | 'overrides'>
): Promise<void> => {
  const response = await calcomRequest<unknown>(
    `/organizations/${env.CALCOM_ORG_ID}/users/${calcomUserId}/schedules/${scheduleId}`,
    {
      method: 'PATCH',
      apiVersion: CALCOM_API_VERSIONS.schedules,
      body: JSON.stringify(payload),
    }
  )
  SuccessResponseSchema.parse(response)
}

export const cancelCalcomBooking = async (
  bookingUid: string,
  cancellationReason: string
): Promise<void> => {
  const response = await calcomRequest<unknown>(`/bookings/${bookingUid}/cancel`, {
    method: 'POST',
    apiVersion: CALCOM_API_VERSIONS.bookings,
    body: JSON.stringify({ cancellationReason }),
  })
  SuccessResponseSchema.parse(response)
}

const CalcomBookingDetailsSchema = z.object({
  uid: z.string(),
  status: z.string(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  duration: z.number().int().positive(),
  cancelledByEmail: z.email().nullish(),
  hosts: z.array(z.object({ email: z.email() })).default([]),
  attendees: z.array(z.object({ email: z.email() })).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

/** Fetch the current Cal.com booking state, including cancellation attribution. */
export const getCalcomBooking = async (bookingUid: string) => {
  const response = await calcomRequest<unknown>(`/bookings/${bookingUid}`, {
    apiVersion: CALCOM_API_VERSIONS.bookings,
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
