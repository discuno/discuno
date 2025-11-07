import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import * as schema from '~/server/db/schema'
import { createTestBooking, createTestMentor, createTestUser, resetCounters } from '../fixtures'
import { assertBooking, assertRecentDate, futureDate, pastDate } from '../helpers'

describe('Booking Flows Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Booking Creation', () => {
    it('should create a booking between mentor and student', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const startTime = futureDate(1)
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 min later

      const booking = await createTestBooking(mentor.id, student.id, {
        title: 'Career Consultation',
        startTime,
        endTime,
        status: 'ACCEPTED',
      })

      assertBooking(booking, {
        title: 'Career Consultation',
        status: 'ACCEPTED',
      })

      expect(booking.startTime.getTime()).toBeCloseTo(startTime.getTime(), -3)
      expect(booking.endTime.getTime()).toBeCloseTo(endTime.getTime(), -3)
      assertRecentDate(booking.createdAt)
    })

    it('should create booking with organizer and attendee', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id)

      // Verify organizer
      const organizer = await testDb.query.bookingOrganizer.findFirst({
        where: eq(schema.bookingOrganizer.bookingId, booking.id),
      })

      expect(organizer).toBeTruthy()
      expect(organizer?.userId).toBe(mentor.id)
      expect(organizer?.name).toBeTruthy()
      expect(organizer?.email).toBeTruthy()

      // Verify attendee
      const attendee = await testDb.query.bookingAttendee.findFirst({
        where: eq(schema.bookingAttendee.bookingId, booking.id),
      })

      expect(attendee).toBeTruthy()
      expect(attendee?.userId).toBe(student.id)
      expect(attendee?.name).toBeTruthy()
      expect(attendee?.email).toBeTruthy()
    })

    it('should associate booking with event type', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id)

      expect(booking.eventTypeId).toBeTruthy()

      const eventType = await testDb.query.mentorEventType.findFirst({
        where: eq(schema.mentorEventType.id, booking.eventTypeId),
      })

      expect(eventType).toBeTruthy()
      expect(eventType?.userId).toBe(mentor.id)
    })
  })

  describe('Booking Status Management', () => {
    it('should update booking status', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id, {
        status: 'PENDING',
      })

      assertBooking(booking, { status: 'PENDING' })

      await testDb
        .update(schema.booking)
        .set({ status: 'ACCEPTED' })
        .where(eq(schema.booking.id, booking.id))

      const updated = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      assertBooking(updated!, { status: 'ACCEPTED' })
    })

    it('should handle booking cancellations', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id, {
        status: 'ACCEPTED',
      })

      const cancellationReason = 'Student requested cancellation'
      await testDb
        .update(schema.booking)
        .set({
          status: 'CANCELLED',
          cancellationReason,
        })
        .where(eq(schema.booking.id, booking.id))

      const cancelled = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(cancelled?.status).toBe('CANCELLED')
      expect(cancelled?.cancellationReason).toBe(cancellationReason)
    })

    it('should handle rescheduled bookings', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const originalStart = futureDate(1)
      const booking = await createTestBooking(mentor.id, student.id, {
        startTime: originalStart,
        status: 'ACCEPTED',
      })

      const newStart = futureDate(2)
      const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000)

      await testDb
        .update(schema.booking)
        .set({
          startTime: newStart,
          endTime: newEnd,
        })
        .where(eq(schema.booking.id, booking.id))

      const rescheduled = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      expect(rescheduled?.startTime.getTime()).toBeCloseTo(newStart.getTime(), -3)
      expect(rescheduled?.endTime.getTime()).toBeCloseTo(newEnd.getTime(), -3)
    })
  })

  describe('Booking Queries', () => {
    it('should query upcoming bookings for a mentor', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()

      // Future booking
      await createTestBooking(mentor.id, student1.id, {
        startTime: futureDate(1),
        status: 'ACCEPTED',
      })

      // Past booking
      await createTestBooking(mentor.id, student2.id, {
        startTime: pastDate(1),
        status: 'ACCEPTED',
      })

      const now = new Date()
      const upcomingBookings = await testDb.query.booking.findMany({
        where: (bookings, { and, eq, gte }) =>
          and(eq(bookings.status, 'ACCEPTED'), gte(bookings.startTime, now)),
        with: {
          organizer: true,
        },
      })

      const mentorBookings = upcomingBookings.filter(b => b.organizer?.userId === mentor.id)
      expect(mentorBookings).toHaveLength(1)
    })

    it('should query past bookings for a mentor', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()

      await createTestBooking(mentor.id, student1.id, {
        startTime: pastDate(2),
        status: 'ACCEPTED',
      })

      await createTestBooking(mentor.id, student2.id, {
        startTime: pastDate(1),
        status: 'ACCEPTED',
      })

      const now = new Date()
      const pastBookings = await testDb.query.booking.findMany({
        where: (bookings, { and, eq, lt }) =>
          and(eq(bookings.status, 'ACCEPTED'), lt(bookings.startTime, now)),
        with: {
          organizer: true,
        },
      })

      const mentorBookings = pastBookings.filter(b => b.organizer?.userId === mentor.id)
      expect(mentorBookings).toHaveLength(2)
    })

    it('should query bookings for a student', async () => {
      const mentor1 = await createTestMentor()
      const mentor2 = await createTestMentor()
      const student = await createTestUser()

      await createTestBooking(mentor1.id, student.id)
      await createTestBooking(mentor2.id, student.id)

      const studentBookings = await testDb.query.booking.findMany({
        with: {
          attendees: true,
        },
      })

      const userBookings = studentBookings.filter(b =>
        b.attendees.some(a => a.userId === student.id)
      )

      expect(userBookings).toHaveLength(2)
    })

    it('should query cancelled bookings', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      await createTestBooking(mentor.id, student.id, { status: 'ACCEPTED' })
      await createTestBooking(mentor.id, student.id, { status: 'CANCELLED' })
      await createTestBooking(mentor.id, student.id, { status: 'CANCELLED' })

      const cancelledBookings = await testDb.query.booking.findMany({
        where: eq(schema.booking.status, 'CANCELLED'),
        with: {
          organizer: true,
        },
      })

      const mentorCancelled = cancelledBookings.filter(b => b.organizer?.userId === mentor.id)
      expect(mentorCancelled).toHaveLength(2)
    })
  })

  describe('Booking with Full Relations', () => {
    it('should query booking with all related data', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id)

      const fullBooking = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
        with: {
          eventType: {
            with: {
              user: {
                with: {
                  profile: true,
                },
              },
            },
          },
          organizer: true,
          attendees: true,
          payment: true,
        },
      })

      expect(fullBooking).toBeTruthy()
      expect(fullBooking?.eventType).toBeTruthy()
      expect(fullBooking?.eventType.user).toBeTruthy()
      expect(fullBooking?.eventType.user.profile).toBeTruthy()
      expect(fullBooking?.organizer).toBeTruthy()
      expect(fullBooking?.attendees).toHaveLength(1)
    })

    it('should handle bookings with multiple attendees', async () => {
      const mentor = await createTestMentor()
      const student1 = await createTestUser()
      const student2 = await createTestUser()

      const booking = await createTestBooking(mentor.id, student1.id)

      // Add another attendee
      await testDb.insert(schema.bookingAttendee).values({
        bookingId: booking.id,
        userId: student2.id,
        name: 'Second Student',
        email: `student2-${student2.id}@example.com`,
        timeZone: 'America/New_York',
      })

      const bookingWithAttendees = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
        with: {
          attendees: true,
        },
      })

      expect(bookingWithAttendees?.attendees).toHaveLength(2)
    })
  })

  describe('Booking Statistics', () => {
    it('should count total bookings for a mentor', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      await createTestBooking(mentor.id, student.id)
      await createTestBooking(mentor.id, student.id)
      await createTestBooking(mentor.id, student.id)

      const bookings = await testDb.query.booking.findMany({
        with: {
          organizer: true,
        },
      })

      const mentorBookings = bookings.filter(b => b.organizer?.userId === mentor.id)
      expect(mentorBookings).toHaveLength(3)
    })

    it('should count completed bookings', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      await createTestBooking(mentor.id, student.id, {
        startTime: pastDate(5),
        status: 'ACCEPTED',
      })

      await createTestBooking(mentor.id, student.id, {
        startTime: pastDate(3),
        status: 'ACCEPTED',
      })

      await createTestBooking(mentor.id, student.id, {
        startTime: futureDate(1),
        status: 'ACCEPTED',
      })

      const now = new Date()
      const completedBookings = await testDb.query.booking.findMany({
        where: (bookings, { and, eq, lt }) =>
          and(eq(bookings.status, 'ACCEPTED'), lt(bookings.endTime, now)),
        with: {
          organizer: true,
        },
      })

      const mentorCompleted = completedBookings.filter(b => b.organizer?.userId === mentor.id)
      expect(mentorCompleted.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Booking Time Validation', () => {
    it('should handle bookings with different durations', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const startTime = futureDate(1)

      // 15 minute booking
      const booking15 = await createTestBooking(mentor.id, student.id, {
        startTime,
        endTime: new Date(startTime.getTime() + 15 * 60 * 1000),
      })

      // 60 minute booking
      const booking60 = await createTestBooking(mentor.id, student.id, {
        startTime: futureDate(2),
        endTime: new Date(futureDate(2).getTime() + 60 * 60 * 1000),
      })

      const duration15 = booking15.endTime.getTime() - booking15.startTime.getTime()
      const duration60 = booking60.endTime.getTime() - booking60.startTime.getTime()

      expect(duration15).toBe(15 * 60 * 1000)
      expect(duration60).toBe(60 * 60 * 1000)
    })

    it('should store booking metadata', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const metadata = {
        meetingLink: 'https://zoom.us/j/123456789',
        notes: 'Career advice session',
      }

      const booking = await testDb
        .insert(schema.booking)
        .values({
          calcomBookingId: 999,
          calcomUid: `test-${Date.now()}`,
          title: 'Test Booking',
          startTime: futureDate(1),
          endTime: new Date(futureDate(1).getTime() + 30 * 60 * 1000),
          status: 'ACCEPTED',
          eventTypeId: (await createTestBooking(mentor.id, student.id)).eventTypeId,
          metadata,
        })
        .returning()

      expect(booking[0]?.metadata).toEqual(metadata)
    })
  })

  describe('Booking Edge Cases', () => {
    it('should handle bookings without payment (free consultation)', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await testDb.query.payment.findFirst({
        where: eq(schema.payment.bookingId, booking.id),
      })

      expect(payment).toBeUndefined()
    })

    it('should prevent duplicate Cal.com booking IDs', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const calcomBookingId = 12345

      await createTestBooking(mentor.id, student.id, { calcomBookingId })

      // Should throw unique constraint error
      await expect(
        testDb.insert(schema.booking).values({
          calcomBookingId,
          calcomUid: `unique-${Date.now()}`,
          title: 'Duplicate Booking',
          startTime: futureDate(1),
          endTime: new Date(futureDate(1).getTime() + 30 * 60 * 1000),
          status: 'ACCEPTED',
          eventTypeId: 1,
        })
      ).rejects.toThrow()
    })

    it('should cascade delete attendees when booking is deleted', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking = await createTestBooking(mentor.id, student.id)

      await testDb.delete(schema.booking).where(eq(schema.booking.id, booking.id))

      const attendees = await testDb.query.bookingAttendee.findMany({
        where: eq(schema.bookingAttendee.bookingId, booking.id),
      })

      expect(attendees).toHaveLength(0)
    })
  })
})
