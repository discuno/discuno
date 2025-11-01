import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { bookings, bookingAttendees, bookingOrganizers } from '~/server/db/schema'
import {
  createTestUser,
  createTestEventType,
  createTestBooking,
  createTestBookingAttendee,
  createTestBookingOrganizer,
  cleanupTestUser,
} from './test-helpers'

describe('Booking Lifecycle Management', () => {
  let mentorUserId: string
  let attendeeUserId: string
  let eventTypeId: number

  beforeEach(async () => {
    // Create mentor user
    const { user: mentor } = await createTestUser({
      name: 'Mentor User',
      email: 'mentor@booking.test',
    })
    mentorUserId = mentor.id

    // Create attendee user
    const { user: attendee } = await createTestUser({
      name: 'Student User',
      email: 'student@booking.test',
    })
    attendeeUserId = attendee.id

    // Create event type for mentor
    const eventType = await createTestEventType(mentorUserId, {
      title: 'Career Consultation',
      duration: 30,
      customPrice: 2500, // $25.00
      isEnabled: true,
    })
    eventTypeId = eventType.id
  })

  afterEach(async () => {
    // Clean up in order due to foreign key constraints
    await testDb.delete(bookingAttendees).where(eq(bookingAttendees.bookingId, -1)) // This will clean up related ones via cascade
    await testDb.delete(bookingOrganizers).where(eq(bookingOrganizers.bookingId, -1))
    await cleanupTestUser(mentorUserId)
    await cleanupTestUser(attendeeUserId)
  })

  it('should create a new booking', async () => {
    const startTime = new Date(Date.now() + 86400000) // Tomorrow
    const endTime = new Date(Date.now() + 90000000) // Tomorrow + 1 hour

    const booking = await createTestBooking(eventTypeId, {
      title: 'Career Consultation',
      startTime,
      endTime,
      status: 'ACCEPTED',
    })

    expect(booking).toBeDefined()
    expect(booking.title).toBe('Career Consultation')
    expect(booking.status).toBe('ACCEPTED')
    expect(booking.mentorEventTypeId).toBe(eventTypeId)
  })

  it('should create booking with attendee', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Test Session',
    })

    const attendee = await createTestBookingAttendee(booking.id, {
      userId: attendeeUserId,
      name: 'Student User',
      email: 'student@booking.test',
    })

    expect(attendee).toBeDefined()
    expect(attendee.bookingId).toBe(booking.id)
    expect(attendee.userId).toBe(attendeeUserId)

    // Clean up
    await testDb.delete(bookingAttendees).where(eq(bookingAttendees.id, attendee.id))
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should create booking with organizer', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Test Session',
    })

    const organizer = await createTestBookingOrganizer(booking.id, mentorUserId, {
      name: 'Mentor User',
      email: 'mentor@booking.test',
      username: 'mentoruser',
    })

    expect(organizer).toBeDefined()
    expect(organizer.bookingId).toBe(booking.id)
    expect(organizer.userId).toBe(mentorUserId)

    // Clean up
    await testDb.delete(bookingOrganizers).where(eq(bookingOrganizers.id, organizer.id))
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should update booking status to cancelled', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Session to Cancel',
      status: 'ACCEPTED',
    })

    // Cancel the booking
    await testDb
      .update(bookings)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))

    // Verify cancellation
    const updated = await testDb.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
    })

    expect(updated?.status).toBe('CANCELLED')

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should update booking status to completed', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Session to Complete',
      status: 'ACCEPTED',
    })

    // Complete the booking
    await testDb
      .update(bookings)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))

    // Verify completion
    const updated = await testDb.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
    })

    expect(updated?.status).toBe('COMPLETED')

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should track booking meeting URL', async () => {
    const meetingUrl = 'https://meet.google.com/abc-defg-hij'
    const booking = await createTestBooking(eventTypeId, {
      title: 'Online Session',
      meetingUrl,
    })

    expect(booking.meetingUrl).toBe(meetingUrl)

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should handle booking time slots correctly', async () => {
    const startTime = new Date('2024-12-25T10:00:00Z')
    const endTime = new Date('2024-12-25T10:30:00Z')

    const booking = await createTestBooking(eventTypeId, {
      title: 'Scheduled Session',
      startTime,
      endTime,
    })

    expect(booking.startTime.getTime()).toBe(startTime.getTime())
    expect(booking.endTime.getTime()).toBe(endTime.getTime())

    // Calculate duration
    const durationMs = booking.endTime.getTime() - booking.startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)

    expect(durationMinutes).toBe(30)

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should retrieve all bookings for a mentor via event types', async () => {
    // Create multiple bookings
    const booking1 = await createTestBooking(eventTypeId, {
      title: 'Booking 1',
    })

    const booking2 = await createTestBooking(eventTypeId, {
      title: 'Booking 2',
    })

    // Query bookings for this event type
    const mentorBookings = await testDb.query.bookings.findMany({
      where: eq(bookings.mentorEventTypeId, eventTypeId),
    })

    expect(mentorBookings.length).toBeGreaterThanOrEqual(2)
    expect(mentorBookings.some(b => b.title === 'Booking 1')).toBe(true)
    expect(mentorBookings.some(b => b.title === 'Booking 2')).toBe(true)

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking1.id))
    await testDb.delete(bookings).where(eq(bookings.id, booking2.id))
  })

  it('should handle no-show scenarios', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'No Show Session',
      status: 'ACCEPTED',
    })

    // Mark as no-show
    await testDb
      .update(bookings)
      .set({
        status: 'NO_SHOW',
        attendeeNoShow: true,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))

    // Verify no-show status
    const updated = await testDb.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
    })

    expect(updated?.status).toBe('NO_SHOW')
    expect(updated?.attendeeNoShow).toBe(true)

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should track Cal.com booking IDs', async () => {
    const calcomBookingId = 98765
    const calcomUid = 'cal_uid_test_123'

    const booking = await createTestBooking(eventTypeId, {
      calcomBookingId,
      calcomUid,
      title: 'Cal.com Synced Booking',
    })

    expect(booking.calcomBookingId).toBe(calcomBookingId)
    expect(booking.calcomUid).toBe(calcomUid)

    // Verify we can find by Cal.com IDs
    const foundById = await testDb.query.bookings.findFirst({
      where: eq(bookings.calcomBookingId, calcomBookingId),
    })

    const foundByUid = await testDb.query.bookings.findFirst({
      where: eq(bookings.calcomUid, calcomUid),
    })

    expect(foundById?.id).toBe(booking.id)
    expect(foundByUid?.id).toBe(booking.id)

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should handle pending booking status', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Pending Booking',
      status: 'PENDING',
    })

    expect(booking.status).toBe('PENDING')

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should handle rejected booking status', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Rejected Booking',
      status: 'ACCEPTED',
    })

    // Reject the booking
    await testDb
      .update(bookings)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))

    const updated = await testDb.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
    })

    expect(updated?.status).toBe('REJECTED')

    // Clean up
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })

  it('should create complete booking with all participants', async () => {
    const booking = await createTestBooking(eventTypeId, {
      title: 'Full Booking',
    })

    const attendee = await createTestBookingAttendee(booking.id, {
      userId: attendeeUserId,
      name: 'Student User',
      email: 'student@booking.test',
    })

    const organizer = await createTestBookingOrganizer(booking.id, mentorUserId, {
      name: 'Mentor User',
      email: 'mentor@booking.test',
      username: 'mentoruser',
    })

    // Verify full booking structure
    const fullBooking = await testDb.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
      with: {
        attendees: true,
        organizers: true,
      },
    })

    expect(fullBooking).toBeDefined()
    expect(fullBooking?.attendees).toHaveLength(1)
    expect(fullBooking?.organizers).toHaveLength(1)
    expect(fullBooking?.attendees[0]?.userId).toBe(attendeeUserId)
    expect(fullBooking?.organizers[0]?.userId).toBe(mentorUserId)

    // Clean up
    await testDb.delete(bookingAttendees).where(eq(bookingAttendees.id, attendee.id))
    await testDb.delete(bookingOrganizers).where(eq(bookingOrganizers.id, organizer.id))
    await testDb.delete(bookings).where(eq(bookings.id, booking.id))
  })
})
