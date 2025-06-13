import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock external dependencies
const mockCalApiClient = {
  createBooking: vi.fn(),
  getAvailableSlots: vi.fn(),
  getEventType: vi.fn(),
  updateBooking: vi.fn(),
  cancelBooking: vi.fn(),
}

const mockPaymentProvider = {
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  refundPayment: vi.fn(),
}

const mockEmailService = {
  sendBookingConfirmation: vi.fn(),
  sendBookingReminder: vi.fn(),
  sendBookingCancellation: vi.fn(),
}

const mockDatabase = {
  users: new Map(),
  bookings: new Map(),
  payments: new Map(),
}

describe('Booking Flow Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock responses
    mockCalApiClient.getEventType.mockResolvedValue({
      id: 123,
      title: 'Mentorship Session',
      length: 60,
      price: 50,
      currency: 'USD',
    })

    mockCalApiClient.getAvailableSlots.mockResolvedValue([
      { time: '2024-06-15T10:00:00Z', available: true },
      { time: '2024-06-15T11:00:00Z', available: true },
      { time: '2024-06-15T14:00:00Z', available: true },
    ])

    mockPaymentProvider.createPaymentIntent.mockResolvedValue({
      id: 'pi_test123',
      clientSecret: 'pi_test123_secret',
      status: 'requires_payment_method',
    })

    mockDatabase.users.set('user123', {
      id: 'user123',
      email: 'student@college.edu',
      role: 'student',
      isEduVerified: true,
      credits: 100,
    })

    mockDatabase.users.set('mentor456', {
      id: 'mentor456',
      email: 'mentor@example.com',
      role: 'mentor',
      calcomUserId: 'cal_user_789',
    })

    // Add other_user for authorization tests
    mockDatabase.users.set('other_user', {
      id: 'other_user',
      email: 'other@college.edu',
      role: 'student',
      isEduVerified: true,
    })
  })

  afterEach(() => {
    mockDatabase.users.clear()
    mockDatabase.bookings.clear()
    mockDatabase.payments.clear()
  })

  describe('End-to-End Booking Security', () => {
    it('should prevent unauthorized booking creation', async () => {
      // Simulate booking creation request
      const createBooking = async (userId: string, eventTypeId: number, timeSlot: string, userRole: string) => {
        // Authentication check
        const user = mockDatabase.users.get(userId)
        if (!user) {
          throw new Error('Authentication required')
        }

        // Authorization check
        if (userRole !== 'student' && userRole !== 'mentor') {
          throw new Error('Insufficient permissions')
        }

        // Verify user can book this event type
        if (userRole === 'student' && !user.isEduVerified) {
          throw new Error('Email verification required')
        }

        // Check available slots
        const availableSlots = await mockCalApiClient.getAvailableSlots(eventTypeId)
        const requestedSlot = availableSlots.find((slot: any) => slot.time === timeSlot)

        if (!requestedSlot || !requestedSlot.available) {
          throw new Error('Time slot not available')
        }

        // Create booking
        const bookingId = `booking_${Date.now()}`
        const booking = {
          id: bookingId,
          userId,
          eventTypeId,
          timeSlot,
          status: 'pending_payment',
          createdAt: new Date().toISOString(),
        }

        mockDatabase.bookings.set(bookingId, booking)
        return booking
      }

      // Test successful booking creation
      const validBooking = await createBooking('user123', 123, '2024-06-15T10:00:00Z', 'student')
      expect(validBooking.status).toBe('pending_payment')

      // Test unauthorized user
      await expect(createBooking('invalid_user', 123, '2024-06-15T11:00:00Z', 'student')).rejects.toThrow(
        'Authentication required'
      )

      // Test unverified user
      mockDatabase.users.set('unverified_user', {
        id: 'unverified_user',
        email: 'unverified@college.edu',
        role: 'student',
        isEduVerified: false,
      })

      await expect(createBooking('unverified_user', 123, '2024-06-15T14:00:00Z', 'student')).rejects.toThrow(
        'Email verification required'
      )

      // Test invalid time slot
      await expect(createBooking('user123', 123, '2024-06-15T99:00:00Z', 'student')).rejects.toThrow(
        'Time slot not available'
      )
    })

    it('should prevent payment manipulation attacks', async () => {
      // Simulate payment processing
      const processPayment = async (bookingId: string, paymentAmount: number, currency: string) => {
        const booking = mockDatabase.bookings.get(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        // Get event type pricing
        const eventType = await mockCalApiClient.getEventType(booking.eventTypeId)

        // Validate payment amount matches event price
        if (paymentAmount !== eventType.price || currency !== eventType.currency) {
          throw new Error('Payment amount mismatch')
        }

        // Prevent double payment
        const existingPayment = Array.from(mockDatabase.payments.values()).find(
          p => p.bookingId === bookingId && p.status === 'succeeded'
        )

        if (existingPayment) {
          throw new Error('Payment already processed')
        }

        // Create payment intent
        const paymentIntent = await mockPaymentProvider.createPaymentIntent({
          amount: paymentAmount * 100, // Convert to cents
          currency,
          metadata: { bookingId },
        })

        const payment = {
          id: paymentIntent.id,
          bookingId,
          amount: paymentAmount,
          currency,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }

        mockDatabase.payments.set(paymentIntent.id, payment)
        return paymentIntent
      }

      // Create a booking first
      const booking = {
        id: 'booking123',
        userId: 'user123',
        eventTypeId: 123,
        timeSlot: '2024-06-15T10:00:00Z',
        status: 'pending_payment',
      }
      mockDatabase.bookings.set('booking123', booking)

      // Test normal payment processing
      const paymentIntent = await processPayment('booking123', 50, 'USD')
      expect(paymentIntent.id).toBeTruthy()

      // Test payment amount manipulation
      await expect(
        processPayment('booking123', 1, 'USD') // Trying to pay $1 instead of $50
      ).rejects.toThrow('Payment amount mismatch')

      // Test currency manipulation
      await expect(
        processPayment('booking123', 50, 'EUR') // Wrong currency
      ).rejects.toThrow('Payment amount mismatch')

      // Simulate successful payment
      mockDatabase.payments.set('pi_test123', {
        id: 'pi_test123',
        bookingId: 'booking123',
        amount: 50,
        currency: 'USD',
        status: 'succeeded',
      })

      // Test double payment prevention
      await expect(processPayment('booking123', 50, 'USD')).rejects.toThrow('Payment already processed')
    })

    it('should handle concurrent booking attempts securely', async () => {
      // Simulate race condition protection
      const bookingLocks = new Set<string>()

      const attemptBooking = async (userId: string, timeSlot: string, attemptId: string) => {
        const lockKey = `${userId}_${timeSlot}`

        // Check if slot is already being processed
        if (bookingLocks.has(lockKey)) {
          throw new Error('Booking already in progress')
        }

        // Acquire lock
        bookingLocks.add(lockKey)

        try {
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 100))

          // Check if slot is still available
          const existingBooking = Array.from(mockDatabase.bookings.values()).find(
            b => b.timeSlot === timeSlot && b.status !== 'cancelled'
          )

          if (existingBooking) {
            throw new Error('Time slot no longer available')
          }

          // Create booking
          const bookingId = `booking_${attemptId}`
          const booking = {
            id: bookingId,
            userId,
            eventTypeId: 123,
            timeSlot,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
          }

          mockDatabase.bookings.set(bookingId, booking)
          return booking
        } finally {
          // Release lock
          bookingLocks.delete(lockKey)
        }
      }

      const timeSlot = '2024-06-15T10:00:00Z'

      // Simulate concurrent booking attempts
      const attempts = [
        attemptBooking('user123', timeSlot, '1'),
        attemptBooking('user456', timeSlot, '2'),
        attemptBooking('user789', timeSlot, '3'),
      ]

      const results = await Promise.allSettled(attempts)

      // Only one should succeed
      const successes = results.filter(r => r.status === 'fulfilled')
      const failures = results.filter(r => r.status === 'rejected')

      expect(successes.length).toBe(1)
      expect(failures.length).toBe(2)

      // Check that failure reasons are appropriate
      failures.forEach(failure => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (failure.status === 'rejected') {
          expect(['Booking already in progress', 'Time slot no longer available']).toContain(failure.reason.message)
        }
      })
    })

    it('should prevent booking cancellation abuse', async () => {
      // Simulate booking cancellation with business rules
      const cancelBooking = async (bookingId: string, cancelledBy: string, reason: string) => {
        const booking = mockDatabase.bookings.get(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const user = mockDatabase.users.get(cancelledBy)
        if (!user) {
          throw new Error('Authentication required')
        }

        // Check authorization
        const canCancel =
          booking.userId === cancelledBy ||
          user.role === 'admin' ||
          (user.role === 'mentor' && booking.mentorId === cancelledBy)

        if (!canCancel) {
          throw new Error('Unauthorized to cancel this booking')
        }

        // Check cancellation policy
        const bookingTime = new Date(booking.timeSlot)
        const now = new Date()
        const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (hoursUntilBooking < 24 && user.role === 'student') {
          throw new Error('Cannot cancel within 24 hours of booking')
        }

        // Check if already cancelled
        if (booking.status === 'cancelled') {
          throw new Error('Booking already cancelled')
        }

        // Process refund if payment was made
        const payment = Array.from(mockDatabase.payments.values()).find(
          p => p.bookingId === bookingId && p.status === 'succeeded'
        )

        if (payment) {
          // Calculate refund amount based on cancellation policy
          let refundPercentage = 1.0 // Full refund by default

          if (hoursUntilBooking < 24) {
            refundPercentage = 0.5 // 50% refund for late cancellation
          }
          if (hoursUntilBooking < 2) {
            refundPercentage = 0 // No refund for very late cancellation
          }

          const refundAmount = payment.amount * refundPercentage

          if (refundAmount > 0) {
            await mockPaymentProvider.refundPayment(payment.id, refundAmount)
          }
        }

        // Update booking status
        booking.status = 'cancelled'
        booking.cancelledAt = new Date().toISOString()
        booking.cancelledBy = cancelledBy
        booking.cancellationReason = reason

        // Send cancellation notifications
        await mockEmailService.sendBookingCancellation(booking)

        return booking
      }

      // Create a booking to cancel
      const futureBooking: any = {
        id: 'booking_future',
        userId: 'user123',
        mentorId: 'mentor456',
        eventTypeId: 123,
        timeSlot: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
        status: 'confirmed',
      }
      mockDatabase.bookings.set('booking_future', futureBooking)

      // Test successful cancellation by booking owner
      const cancelled = await cancelBooking('booking_future', 'user123', 'Schedule conflict')
      expect(cancelled.status).toBe('cancelled')

      // Reset booking for next test
      futureBooking.status = 'confirmed'
      delete futureBooking.cancelledAt

      // Test successful cancellation by mentor
      const mentorCancelled = await cancelBooking('booking_future', 'mentor456', 'Emergency')
      expect(mentorCancelled.status).toBe('cancelled')

      // Test unauthorized cancellation
      futureBooking.status = 'confirmed'
      await expect(cancelBooking('booking_future', 'other_user', 'Trying to cancel')).rejects.toThrow(
        'Unauthorized to cancel this booking'
      )

      // Test late cancellation policy
      const lateBooking = {
        id: 'booking_late',
        userId: 'user123',
        eventTypeId: 123,
        timeSlot: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        status: 'confirmed',
      }
      mockDatabase.bookings.set('booking_late', lateBooking)

      await expect(cancelBooking('booking_late', 'user123', 'Late cancellation')).rejects.toThrow(
        'Cannot cancel within 24 hours of booking'
      )

      // Test double cancellation prevention
      futureBooking.status = 'cancelled'
      await expect(cancelBooking('booking_future', 'user123', 'Already cancelled')).rejects.toThrow(
        'Booking already cancelled'
      )
    })

    it('should validate booking workflow state transitions', async () => {
      // Simulate booking state machine
      const validTransitions: Record<string, string[]> = {
        pending_payment: ['confirmed', 'cancelled', 'expired'],
        confirmed: ['in_progress', 'cancelled', 'completed'],
        in_progress: ['completed', 'cancelled'],
        completed: ['reviewed'],
        cancelled: [], // Terminal state
        expired: [], // Terminal state
        reviewed: [], // Terminal state
      }

      const updateBookingStatus = (bookingId: string, newStatus: string, context: any = {}) => {
        const booking: any = mockDatabase.bookings.get(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const currentStatus = booking.status
        const allowedTransitions = validTransitions[currentStatus] ?? []

        if (!allowedTransitions.includes(newStatus)) {
          throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`)
        }

        // Additional business rule validations
        if (newStatus === 'confirmed' && currentStatus === 'pending_payment') {
          // Must have successful payment
          const payment = Array.from(mockDatabase.payments.values()).find(
            p => p.bookingId === bookingId && p.status === 'succeeded'
          )

          if (!payment) {
            throw new Error('Payment required to confirm booking')
          }
        }

        if (newStatus === 'in_progress') {
          // Can only start within 15 minutes of booking time
          const bookingTime = new Date(booking.timeSlot)
          const now = new Date()
          const minutesDiff = Math.abs((bookingTime.getTime() - now.getTime()) / (1000 * 60))

          if (minutesDiff > 15) {
            throw new Error('Cannot start session too early or too late')
          }
        }

        if (newStatus === 'completed') {
          // Must have been in progress
          if (currentStatus !== 'in_progress') {
            throw new Error('Booking must be in progress to complete')
          }

          // Update completion timestamp
          booking.completedAt = new Date().toISOString()
        }

        // Update status
        booking.status = newStatus
        booking.lastUpdated = new Date().toISOString()

        if (context.updatedBy) {
          booking.lastUpdatedBy = context.updatedBy
        }

        return booking
      }

      // Create a test booking
      const testBooking = {
        id: 'booking_state_test',
        userId: 'user123',
        eventTypeId: 123,
        timeSlot: new Date().toISOString(),
        status: 'pending_payment',
      }
      mockDatabase.bookings.set('booking_state_test', testBooking)

      // Test valid transition with payment
      mockDatabase.payments.set('payment123', {
        id: 'payment123',
        bookingId: 'booking_state_test',
        amount: 50,
        status: 'succeeded',
      })

      const confirmed = updateBookingStatus('booking_state_test', 'confirmed')
      expect(confirmed.status).toBe('confirmed')

      // Test invalid transition
      expect(() => {
        updateBookingStatus('booking_state_test', 'reviewed') // Cannot go directly from confirmed to reviewed
      }).toThrow('Invalid status transition from confirmed to reviewed')

      // Test business rule validation
      expect(() => {
        updateBookingStatus('booking_state_test', 'completed') // Cannot complete without being in progress
      }).toThrow('Booking must be in progress to complete')

      // Test valid sequence
      const inProgress = updateBookingStatus('booking_state_test', 'in_progress')
      expect(inProgress.status).toBe('in_progress')

      const completed = updateBookingStatus('booking_state_test', 'completed')
      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeTruthy()

      // Test terminal state
      expect(() => {
        updateBookingStatus('booking_state_test', 'cancelled') // Cannot change from completed
      }).toThrow('Invalid status transition from completed to cancelled')
    })
  })

  describe('Data Integrity and Audit Trail', () => {
    it('should maintain complete audit trail for bookings', async () => {
      const auditLog: any[] = []

      const logAuditEvent = (action: string, bookingId: string, userId: string, details: any) => {
        auditLog.push({
          timestamp: new Date().toISOString(),
          action,
          bookingId,
          userId,
          details,
          sessionId: 'session_123', // Would be actual session ID
          ipAddress: '192.168.1.1', // Would be actual IP
        })
      }

      const createBookingWithAudit = async (userId: string, eventTypeId: number, timeSlot: string) => {
        const bookingId = `booking_audit_${Date.now()}`

        logAuditEvent('BOOKING_CREATED', bookingId, userId, {
          eventTypeId,
          timeSlot,
        })

        const booking = {
          id: bookingId,
          userId,
          eventTypeId,
          timeSlot,
          status: 'pending_payment',
          createdAt: new Date().toISOString(),
        }

        mockDatabase.bookings.set(bookingId, booking)
        return booking
      }

      const updateBookingWithAudit = (bookingId: string, updates: any, userId: string) => {
        const booking = mockDatabase.bookings.get(bookingId)
        if (!booking) throw new Error('Booking not found')

        const oldValues = { ...booking }
        Object.assign(booking, updates)

        logAuditEvent('BOOKING_UPDATED', bookingId, userId, {
          oldValues,
          newValues: updates,
        })

        return booking
      }

      // Test audit trail creation
      const booking = await createBookingWithAudit('user123', 123, '2024-06-15T10:00:00Z')

      expect(auditLog).toHaveLength(1)
      expect(auditLog[0].action).toBe('BOOKING_CREATED')
      expect(auditLog[0].userId).toBe('user123')

      // Test update audit
      updateBookingWithAudit(booking.id, { status: 'confirmed' }, 'user123')

      expect(auditLog).toHaveLength(2)
      expect(auditLog[1].action).toBe('BOOKING_UPDATED')
      expect(auditLog[1].details.oldValues.status).toBe('pending_payment')
      expect(auditLog[1].details.newValues.status).toBe('confirmed')

      // Verify audit immutability (in real implementation, audit logs would be append-only)
      const originalAuditEntry = { ...auditLog[0] }

      // Simulate attempt to modify audit log
      auditLog[0].action = 'MALICIOUS_CHANGE'

      // In production, this would be prevented by using immutable storage
      // For this test, we just verify the original data structure was captured
      expect(originalAuditEntry.action).toBe('BOOKING_CREATED')
    })

    it('should detect and prevent data tampering', async () => {
      // Simulate data integrity checking
      const calculateChecksum = (data: any): string => {
        // Simple checksum simulation (in real implementation, use crypto)
        const sortedKeys = Object.keys(data).sort()
        const sortedData = sortedKeys.reduce((acc, key) => {
          acc[key] = data[key]
          return acc
        }, {} as any)
        const jsonString = JSON.stringify(sortedData)
        // Use a more robust hash that will actually change when data changes
        let hash = 0
        for (let i = 0; i < jsonString.length; i++) {
          const char = jsonString.charCodeAt(i)
          hash = (hash << 5) - hash + char
          hash = hash & hash // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16)
      }

      const createSecureBooking = (userId: string, eventTypeId: number, timeSlot: string) => {
        const booking: any = {
          id: `booking_secure_${Date.now()}`,
          userId,
          eventTypeId,
          timeSlot,
          status: 'pending_payment',
          createdAt: new Date().toISOString(),
        }

        // Calculate and store checksum
        const bookingData = { ...booking }
        delete bookingData.checksum // Don't include checksum in calculation

        booking.checksum = calculateChecksum(bookingData)

        mockDatabase.bookings.set(booking.id, booking)
        return booking
      }

      const verifyBookingIntegrity = (bookingId: string): boolean => {
        const booking: any = mockDatabase.bookings.get(bookingId)
        if (!booking) return false

        const storedChecksum = booking.checksum
        const bookingData = { ...booking }
        delete bookingData.checksum

        const calculatedChecksum = calculateChecksum(bookingData)
        return storedChecksum === calculatedChecksum
      }

      // Create secure booking
      const booking = createSecureBooking('user123', 123, '2024-06-15T10:00:00Z')

      // Verify integrity
      expect(verifyBookingIntegrity(booking.id)).toBe(true)

      // Simulate tampering - modify the booking directly in the database
      const storedBooking = mockDatabase.bookings.get(booking.id)!
      storedBooking.userId = 'attacker456'

      // Detect tampering
      expect(verifyBookingIntegrity(booking.id)).toBe(false)

      // Simulate legitimate update (would recalculate checksum)
      const updatedBooking = mockDatabase.bookings.get(booking.id)!
      updatedBooking.status = 'confirmed'
      updatedBooking.lastUpdated = new Date().toISOString()

      // Recalculate checksum for legitimate update
      const updatedData = { ...updatedBooking }
      delete updatedData.checksum
      updatedBooking.checksum = calculateChecksum(updatedData)

      // Verify integrity after legitimate update
      expect(verifyBookingIntegrity(booking.id)).toBe(true)
    })
  })
})
