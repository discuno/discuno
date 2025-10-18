import 'server-only'

import { desc, eq } from 'drizzle-orm'
import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import { NotFoundError } from '~/lib/errors'
import { db } from '~/server/db'
import { bookingAttendees, bookingOrganizers, bookings, mentorEventTypes } from '~/server/db/schema'

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
      id: bookings.id,
      calcomBookingId: bookings.calcomBookingId,
      calcomUid: bookings.calcomUid,
      title: bookings.title,
      description: bookings.description,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      meetingUrl: bookings.meetingUrl,
      attendeeName: bookingAttendees.name,
      attendeeEmail: bookingAttendees.email,
      attendeeTimeZone: bookingAttendees.timeZone,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(bookingAttendees, eq(bookings.id, bookingAttendees.bookingId))
    .innerJoin(bookingOrganizers, eq(bookings.id, bookingOrganizers.bookingId))
    .where(eq(bookingOrganizers.userId, mentorId))
    .orderBy(desc(bookings.startTime))
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
    const mentorEventType = await tx.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.calcomEventTypeId, input.calcomEventTypeId),
    })

    if (!mentorEventType) {
      throw new NotFoundError(
        `Mentor event type with Cal.com ID ${input.calcomEventTypeId} not found`
      )
    }

    // Create the booking record
    const [booking] = await tx
      .insert(bookings)
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
    await tx.insert(bookingOrganizers).values({
      ...input.organizer,
      bookingId: booking.id,
    })

    // Create the attendee record
    await tx.insert(bookingAttendees).values({
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
    .update(bookings)
    .set({ status: 'CANCELLED' })
    .where(eq(bookings.calcomUid, calcomBookingUid))
    .returning({ id: bookings.id })

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
    .update(bookings)
    .set({
      status,
      hostNoShow: options?.hostNoShow,
      attendeeNoShow: options?.attendeeNoShow,
    })
    .where(eq(bookings.calcomUid, calcomBookingUid))
    .returning({ id: bookings.id })

  if (!result) {
    throw new NotFoundError(`Booking with Cal.com UID ${calcomBookingUid} not found`)
  }

  return result
}
