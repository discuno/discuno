import 'server-only'

import { desc, eq } from 'drizzle-orm'
import { NotFoundError } from '~/lib/errors'
import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema'

/**
 * Data Access Layer for bookings
 * Raw database operations with no caching or auth checks
 */

/**
 * Get all bookings for a mentor with attendee information
 */
export const getBookingsByMentorId = async (mentorId: string) => {
  return db
    .select({
      id: schema.booking.id,
      calcomBookingId: schema.booking.calcomBookingId,
      calcomUid: schema.booking.calcomUid,
      title: schema.booking.title,
      description: schema.booking.description,
      startTime: schema.booking.startTime,
      endTime: schema.booking.endTime,
      status: schema.booking.status,
      meetingUrl: schema.booking.meetingUrl,
      attendeeName: schema.bookingAttendee.name,
      attendeeEmail: schema.bookingAttendee.email,
      attendeeTimeZone: schema.bookingAttendee.timeZone,
      createdAt: schema.booking.createdAt,
    })
    .from(schema.booking)
    .innerJoin(schema.bookingAttendee, eq(schema.booking.id, schema.bookingAttendee.bookingId))
    .innerJoin(schema.bookingOrganizer, eq(schema.booking.id, schema.bookingOrganizer.bookingId))
    .where(eq(schema.bookingOrganizer.userId, mentorId))
    .orderBy(desc(schema.booking.startTime))
}

/**
 * Create a booking with organizer and attendee
 */
type CreateBookingInput = NewBooking & {
  duration: number
  calcomEventTypeId: number
  organizer: Omit<NewBookingOrganizer, 'bookingId'>
  attendee: Omit<NewBookingAttendee, 'bookingId'>
  meetingUrl?: string
}

export const createBooking = async (input: CreateBookingInput) => {
  return db.transaction(async tx => {
    // Look up the internal mentor event type ID from the Cal.com event type ID
    const mentorEventType = await tx.query.mentorEventType.findFirst({
      where: eq(schema.mentorEventType.calcomEventTypeId, input.calcomEventTypeId),
    })

    if (!mentorEventType) {
      throw new NotFoundError(
        `Mentor event type with Cal.com ID ${input.calcomEventTypeId} not found`
      )
    }

    // Create the booking record
    const [booking] = await tx
      .insert(schema.booking)
      .values({
        calcomBookingId: input.calcomBookingId,
        calcomUid: input.calcomUid,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'ACCEPTED',
        mentorEventTypeId: mentorEventType.id,
        paymentId: input.paymentId,
        webhookPayload: {},
        meetingUrl: input.meetingUrl,
      })
      .returning()

    if (!booking) {
      throw new Error(
        `Failed to create booking record for calcomBookingId: ${input.calcomBookingId}, calcomUid: ${input.calcomUid}, title: ${input.title}`
      )
    }

    // Create the organizer record
    await tx.insert(schema.bookingOrganizer).values({
      ...input.organizer,
      bookingId: booking.id,
    })

    // Create the attendee record
    await tx.insert(schema.bookingAttendee).values({
      ...input.attendee,
      bookingId: booking.id,
    })

    return booking
  })
}

/**
 * Cancel a booking by Cal.com UID
 */
export const cancelBooking = async (calcomBookingUid: string) => {
  const [result] = await db
    .update(schema.booking)
    .set({ status: 'CANCELLED' })
    .where(eq(schema.booking.calcomUid, calcomBookingUid))
    .returning({ id: schema.booking.id })

  if (!result) {
    throw new NotFoundError(`Booking with Cal.com UID ${calcomBookingUid} not found`)
  }

  return result
}

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  calcomBookingUid: string,
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
  options?: {
    hostNoShow?: boolean
    attendeeNoShow?: boolean
  }
) => {
  const [result] = await db
    .update(schema.booking)
    .set({
      status,
      hostNoShow: options?.hostNoShow,
      attendeeNoShow: options?.attendeeNoShow,
    })
    .where(eq(schema.booking.calcomUid, calcomBookingUid))
    .returning({ id: schema.booking.id })

  if (!result) {
    throw new NotFoundError(`Booking with Cal.com UID ${calcomBookingUid} not found`)
  }

  return result
}
