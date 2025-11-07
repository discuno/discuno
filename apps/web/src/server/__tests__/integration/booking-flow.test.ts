import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import {
  createCompleteBooking,
  createCompleteMentor,
  createCompleteUser,
  createTestBooking,
  createTestBookingAttendee,
  createTestBookingOrganizer,
} from '../factories'
import {
  assertBookingExists,
  futureDate,
  getBookingWithRelations,
  getPastBookings,
  getUpcomingBookings,
  pastDate,
} from '../helpers'

vi.mock('server-only', () => ({}))

describe('Booking Flow Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Booking Creation', () => {
    it('should create a booking with mentor event type', async () => {
      const mentor = await createCompleteMentor()

      const booking = await createTestBooking(mentor.eventType.id, {
        title: '30-min Career Chat',
        description: 'Discussion about software engineering career',
        startTime: futureDate(1),
        endTime: futureDate(1),
        status: 'ACCEPTED',
      })

      expect(booking.id).toBeDefined()
      expect(booking.mentorEventTypeId).toBe(mentor.eventType.id)
      expect(booking.title).toBe('30-min Career Chat')
      expect(booking.status).toBe('ACCEPTED')
      expect(booking.calcomBookingId).toBeDefined()
      expect(booking.calcomUid).toBeDefined()

      await assertBookingExists(booking.id)
    })

    it('should enforce unique calcomBookingId constraint', async () => {
      const mentor = await createCompleteMentor()
      const calcomBookingId = 99999

      await createTestBooking(mentor.eventType.id, { calcomBookingId })

      // Creating another booking with same Cal.com ID should fail
      await expect(createTestBooking(mentor.eventType.id, { calcomBookingId })).rejects.toThrow()
    })

    it('should enforce unique calcomUid constraint', async () => {
      const mentor = await createCompleteMentor()
      const calcomUid = 'unique_booking_uid'

      await createTestBooking(mentor.eventType.id, { calcomUid })

      // Creating another booking with same UID should fail
      await expect(createTestBooking(mentor.eventType.id, { calcomUid })).rejects.toThrow()
    })

    it('should support all booking status values', async () => {
      const mentor = await createCompleteMentor()
      const statuses: Array<
        'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | 'COMPLETED' | 'NO_SHOW'
      > = ['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW']

      for (const status of statuses) {
        const booking = await createTestBooking(mentor.eventType.id, { status })
        expect(booking.status).toBe(status)
      }
    })

    it('should store webhook payload for auditing', async () => {
      const mentor = await createCompleteMentor()
      const webhookPayload = {
        id: 123,
        uid: 'test_uid',
        title: 'Test Booking',
        startTime: new Date().toISOString(),
      }

      const booking = await createTestBooking(mentor.eventType.id, {
        webhookPayload,
      })

      expect(booking.webhookPayload).toEqual(webhookPayload)
    })
  })

  describe('Booking Attendees', () => {
    it('should add an attendee to a booking', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()
      const booking = await createTestBooking(mentor.eventType.id)

      const attendee = await createTestBookingAttendee(booking.id, student.id, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        timeZone: 'America/New_York',
      })

      expect(attendee.bookingId).toBe(booking.id)
      expect(attendee.userId).toBe(student.id)
      expect(attendee.name).toBe('John Doe')
      expect(attendee.email).toBe('john@example.com')
      expect(attendee.phoneNumber).toBe('+1234567890')
    })

    it('should support attendees without user accounts (null userId)', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id)

      const attendee = await createTestBookingAttendee(booking.id, null, {
        name: 'Guest User',
        email: 'guest@example.com',
      })

      expect(attendee.bookingId).toBe(booking.id)
      expect(attendee.userId).toBeNull()
      expect(attendee.name).toBe('Guest User')
    })

    it('should cascade delete attendees when booking is deleted', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()
      const booking = await createTestBooking(mentor.eventType.id)
      const attendee = await createTestBookingAttendee(booking.id, student.id)

      await testDb.delete(schema.booking).where(eq(schema.booking.id, booking.id))

      const deletedAttendee = await testDb.query.bookingAttendee.findFirst({
        where: eq(schema.bookingAttendee.id, attendee.id),
      })

      expect(deletedAttendee).toBeUndefined()
    })
  })

  describe('Booking Organizers', () => {
    it('should add an organizer (mentor) to a booking', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id)

      const organizer = await createTestBookingOrganizer(booking.id, mentor.user.id, {
        name: mentor.user.name!,
        email: mentor.user.email!,
        username: mentor.calcomToken.calcomUsername,
      })

      expect(organizer.bookingId).toBe(booking.id)
      expect(organizer.userId).toBe(mentor.user.id)
      expect(organizer.username).toBe(mentor.calcomToken.calcomUsername)
    })

    it('should cascade delete organizers when booking is deleted', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id)
      const organizer = await createTestBookingOrganizer(booking.id, mentor.user.id)

      await testDb.delete(schema.booking).where(eq(schema.booking.id, booking.id))

      const deletedOrganizer = await testDb.query.bookingOrganizer.findFirst({
        where: eq(schema.bookingOrganizer.id, organizer.id),
      })

      expect(deletedOrganizer).toBeUndefined()
    })
  })

  describe('Complete Booking Flow', () => {
    it('should create a complete booking with all components', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking, payment, attendee, organizer } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id,
        {
          booking: {
            title: 'Complete Booking Test',
            startTime: futureDate(2),
            endTime: futureDate(2),
          },
          payment: {
            amount: 5000,
            mentorFee: 4000,
            menteeFee: 1000,
          },
          attendee: {
            name: student.name!,
            email: student.email!,
          },
          organizer: {
            name: mentor.user.name!,
            email: mentor.user.email!,
          },
        }
      )

      expect(booking.id).toBeDefined()
      expect(payment.id).toBeDefined()
      expect(attendee.userId).toBe(student.id)
      expect(organizer.userId).toBe(mentor.user.id)
      expect(booking.paymentId).toBe(payment.id)
    })

    it('should retrieve booking with all relations', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id
      )

      const fullBooking = await getBookingWithRelations(booking.id)

      expect(fullBooking).toBeDefined()
      expect(fullBooking?.attendees).toHaveLength(1)
      expect(fullBooking?.organizers).toHaveLength(1)
      expect(fullBooking?.payment).toBeDefined()
    })
  })

  describe('Booking Status Updates', () => {
    it('should update booking status from PENDING to ACCEPTED', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id, {
        status: 'PENDING',
      })

      expect(booking.status).toBe('PENDING')

      await testDb
        .update(schema.booking)
        .set({ status: 'ACCEPTED' })
        .where(eq(schema.booking.id, booking.id))

      const updated = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(updated?.status).toBe('ACCEPTED')
    })

    it('should mark booking as CANCELLED', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id,
        {
          booking: { status: 'ACCEPTED' },
        }
      )

      await testDb
        .update(schema.booking)
        .set({ status: 'CANCELLED' })
        .where(eq(schema.booking.id, booking.id))

      const cancelled = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(cancelled?.status).toBe('CANCELLED')
    })

    it('should track no-show status for both host and attendee', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id, {
        hostNoShow: false,
        attendeeNoShow: false,
      })

      // Mark attendee as no-show
      await testDb
        .update(schema.booking)
        .set({ attendeeNoShow: true })
        .where(eq(schema.booking.id, booking.id))

      const updated = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(updated?.attendeeNoShow).toBe(true)
      expect(updated?.hostNoShow).toBe(false)
    })
  })

  describe('Booking Time Management', () => {
    it('should retrieve upcoming bookings for a student', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      // Create upcoming booking
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student.id, {
        booking: {
          startTime: futureDate(3),
          endTime: futureDate(3),
        },
      })

      // Create past booking
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student.id, {
        booking: {
          startTime: pastDate(3),
          endTime: pastDate(3),
        },
      })

      const upcomingBookings = await getUpcomingBookings(student.id, false)

      expect(upcomingBookings).toHaveLength(1)
    })

    it('should retrieve past bookings for a student', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      // Create upcoming booking
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student.id, {
        booking: {
          startTime: futureDate(3),
          endTime: futureDate(3),
        },
      })

      // Create past booking
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student.id, {
        booking: {
          startTime: pastDate(3),
          endTime: pastDate(3),
        },
      })

      const pastBookings = await getPastBookings(student.id, false)

      expect(pastBookings).toHaveLength(1)
    })

    it('should retrieve upcoming bookings for a mentor', async () => {
      const mentor = await createCompleteMentor()
      const { user: student1 } = await createCompleteUser()
      const { user: student2 } = await createCompleteUser()

      // Create upcoming bookings
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student1.id, {
        booking: {
          startTime: futureDate(1),
          endTime: futureDate(1),
        },
      })

      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student2.id, {
        booking: {
          startTime: futureDate(5),
          endTime: futureDate(5),
        },
      })

      const upcomingBookings = await getUpcomingBookings(mentor.user.id, true)

      expect(upcomingBookings).toHaveLength(2)
    })

    it('should retrieve past bookings for a mentor', async () => {
      const mentor = await createCompleteMentor()
      const { user: student1 } = await createCompleteUser()
      const { user: student2 } = await createCompleteUser()

      // Create past bookings
      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student1.id, {
        booking: {
          startTime: pastDate(10),
          endTime: pastDate(10),
        },
      })

      await createCompleteBooking(mentor.eventType.id, mentor.user.id, student2.id, {
        booking: {
          startTime: pastDate(5),
          endTime: pastDate(5),
        },
      })

      const pastBookings = await getPastBookings(mentor.user.id, true)

      expect(pastBookings).toHaveLength(2)
    })
  })

  describe('Booking Deletion and Cascades', () => {
    it('should set mentorEventTypeId to null when event type is deleted', async () => {
      const mentor = await createCompleteMentor()
      const booking = await createTestBooking(mentor.eventType.id)

      expect(booking.mentorEventTypeId).toBe(mentor.eventType.id)

      await testDb
        .delete(schema.mentorEventType)
        .where(eq(schema.mentorEventType.id, mentor.eventType.id))

      const updated = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(updated?.mentorEventTypeId).toBeNull()
    })

    it('should set paymentId to null when payment is deleted', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking, payment } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id
      )

      expect(booking.paymentId).toBe(payment.id)

      await testDb.delete(schema.payment).where(eq(schema.payment.id, payment.id))

      const updated = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(updated?.paymentId).toBeNull()
    })
  })
})
