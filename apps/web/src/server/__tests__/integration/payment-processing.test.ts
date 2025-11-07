import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import {
  createCompleteBooking,
  createCompleteMentor,
  createCompleteUser,
  createTestPayment,
  createTestStripeAccount,
} from '../factories'
import { assertPaymentStatus, getMentorEarnings, pastDate } from '../helpers'

vi.mock('server-only', () => ({}))

describe('Payment Processing Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Payment Creation', () => {
    it('should create a payment for a booking', async () => {
      const mentor = await createCompleteMentor()

      const payment = await createTestPayment(mentor.user.id, {
        amount: 5000, // $50
        mentorAmount: 4000, // $40
        menteeFee: 1000, // $10 platform fee
        customerEmail: 'student@example.com',
        customerName: 'Student Name',
      })

      expect(payment.id).toBeDefined()
      expect(payment.mentorUserId).toBe(mentor.user.id)
      expect(payment.amount).toBe(5000)
      expect(payment.mentorFee).toBe(4000)
      expect(payment.menteeFee).toBe(1000)
      expect(payment.platformStatus).toBe('PENDING')
      expect(payment.stripePaymentIntentId).toBeDefined()
      expect(payment.stripeCheckoutSessionId).toBeDefined()
    })

    it('should enforce unique stripePaymentIntentId constraint', async () => {
      const mentor = await createCompleteMentor()
      const stripePaymentIntentId = 'pi_unique_test_123'

      await createTestPayment(mentor.user.id, { stripePaymentIntentId })

      await expect(createTestPayment(mentor.user.id, { stripePaymentIntentId })).rejects.toThrow()
    })

    it('should enforce unique stripeCheckoutSessionId constraint', async () => {
      const mentor = await createCompleteMentor()
      const stripeCheckoutSessionId = 'cs_unique_test_123'

      await createTestPayment(mentor.user.id, { stripeCheckoutSessionId })

      await expect(createTestPayment(mentor.user.id, { stripeCheckoutSessionId })).rejects.toThrow()
    })

    it('should calculate platform and mentor fees correctly', async () => {
      const mentor = await createCompleteMentor()
      const totalAmount = 10000 // $100
      const platformFee = 2000 // $20 (20%)
      const mentorFee = 8000 // $80

      const payment = await createTestPayment(mentor.user.id, {
        amount: totalAmount,
        mentorAmount: mentorFee,
        menteeFee: platformFee,
      })

      expect(payment.amount).toBe(totalAmount)
      expect(payment.mentorFee).toBe(mentorFee)
      expect(payment.menteeFee).toBe(platformFee)
      expect(payment.mentorFee + payment.menteeFee).toBe(totalAmount)
    })
  })

  describe('Payment Status Transitions', () => {
    it('should update payment status from PENDING to SUCCEEDED', async () => {
      const mentor = await createCompleteMentor()
      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'PENDING',
      })

      expect(payment.platformStatus).toBe('PENDING')

      await testDb
        .update(schema.payment)
        .set({ platformStatus: 'SUCCEEDED' })
        .where(eq(schema.payment.id, payment.id))

      await assertPaymentStatus(payment.id, 'SUCCEEDED')
    })

    it('should handle FAILED payment status', async () => {
      const mentor = await createCompleteMentor()
      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'PENDING',
      })

      await testDb
        .update(schema.payment)
        .set({ platformStatus: 'FAILED' })
        .where(eq(schema.payment.id, payment.id))

      await assertPaymentStatus(payment.id, 'FAILED')
    })

    it('should handle REFUNDED payment status', async () => {
      const mentor = await createCompleteMentor()
      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
      })

      await testDb
        .update(schema.payment)
        .set({ platformStatus: 'REFUNDED' })
        .where(eq(schema.payment.id, payment.id))

      await assertPaymentStatus(payment.id, 'REFUNDED')
    })

    it('should support all payment status values', async () => {
      const mentor = await createCompleteMentor()
      const statuses: Array<
        'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'DISPUTED' | 'REFUNDED' | 'TRANSFERRED'
      > = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DISPUTED', 'REFUNDED', 'TRANSFERRED']

      for (const status of statuses) {
        const payment = await createTestPayment(mentor.user.id, { platformStatus: status })
        expect(payment.platformStatus).toBe(status)
      }
    })
  })

  describe('Payment Transfers to Mentors', () => {
    it('should track when payment is transferred to mentor', async () => {
      const mentor = await createCompleteMentor()
      await createTestStripeAccount(mentor.user.id)

      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
      })

      expect(payment.transferId).toBeNull()

      // Simulate transfer
      await testDb
        .update(schema.payment)
        .set({
          transferStatus: 'transferred',
          transferId: 'tr_test_123',
        })
        .where(eq(schema.payment.id, payment.id))

      const updated = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(updated?.transferStatus).toBe('transferred')
      expect(updated?.transferId).toBe('tr_test_123')
    })

    it('should not transfer payment immediately after success (dispute period)', async () => {
      const mentor = await createCompleteMentor()
      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
      })

      expect(payment.transferId).toBeNull()
      expect(payment.transferStatus).toBeNull()
    })

    it('should track dispute period end date', async () => {
      const mentor = await createCompleteMentor()
      const disputePeriodEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        disputePeriodEnds,
      })

      expect(payment.disputePeriodEnds.getTime()).toBeCloseTo(disputePeriodEnds.getTime(), -2)
      expect(payment.transferId).toBeNull()
    })
  })

  describe('Mentor Earnings Tracking', () => {
    it('should calculate total earnings for a mentor', async () => {
      const mentor = await createCompleteMentor()

      // Create multiple successful payments
      await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        mentorAmount: 4000,
      })

      await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        mentorAmount: 3000,
      })

      const earnings = await getMentorEarnings(mentor.user.id)

      expect(earnings.total).toBe(7000)
      expect(earnings.succeededCount).toBe(2)
    })

    it('should track pending transfers (succeeded but not transferred)', async () => {
      const mentor = await createCompleteMentor()

      // Succeeded payment not yet transferred
      await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        mentorAmount: 5000,
      })

      // Succeeded and transferred payment
      await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        mentorAmount: 3000,
        transferId: 'tr_test_123',
        transferStatus: 'transferred',
      })

      const earnings = await getMentorEarnings(mentor.user.id)

      expect(earnings.pendingAmount).toBe(5000)
      expect(earnings.transferredCount).toBe(1)
    })

    it('should exclude failed and refunded payments from earnings', async () => {
      const mentor = await createCompleteMentor()

      await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
        mentorAmount: 4000,
      })

      await createTestPayment(mentor.user.id, {
        platformStatus: 'FAILED',
        mentorAmount: 2000,
      })

      await createTestPayment(mentor.user.id, {
        platformStatus: 'REFUNDED',
        mentorAmount: 1000,
      })

      const earnings = await getMentorEarnings(mentor.user.id)

      // Only succeeded payment should count
      expect(earnings.total).toBe(4000)
      expect(earnings.succeededCount).toBe(1)
    })
  })

  describe('Payment and Booking Integration', () => {
    it('should link payment to booking', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking, payment } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id,
        {
          payment: {
            amount: 5000,
            mentorAmount: 4000,
            menteeFee: 1000,
          },
        }
      )

      expect(booking.paymentId).toBe(payment.id)

      // Verify relationship
      const bookingWithPayment = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
        with: { payment: true },
      })

      expect(bookingWithPayment?.payment?.id).toBe(payment.id)
    })

    it('should handle refunds for cancelled bookings', async () => {
      const mentor = await createCompleteMentor()
      const { user: student } = await createCompleteUser()

      const { booking, payment } = await createCompleteBooking(
        mentor.eventType.id,
        mentor.user.id,
        student.id,
        {
          payment: { platformStatus: 'SUCCEEDED' },
        }
      )

      // Cancel booking and refund payment
      await testDb
        .update(schema.booking)
        .set({ status: 'CANCELLED' })
        .where(eq(schema.booking.id, booking.id))

      await testDb
        .update(schema.payment)
        .set({ platformStatus: 'REFUNDED' })
        .where(eq(schema.payment.id, payment.id))

      const updatedBooking = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
      })

      const updatedPayment = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(updatedBooking?.status).toBe('CANCELLED')
      expect(updatedPayment?.platformStatus).toBe('REFUNDED')
    })
  })

  describe('Payment Metadata and Tracking', () => {
    it('should store customer information', async () => {
      const mentor = await createCompleteMentor()

      const payment = await createTestPayment(mentor.user.id, {
        customerEmail: 'john.doe@example.com',
        customerName: 'John Doe',
      })

      expect(payment.customerEmail).toBe('john.doe@example.com')
      expect(payment.customerName).toBe('John Doe')
    })

    it('should support different currencies', async () => {
      const mentor = await createCompleteMentor()

      const usdPayment = await createTestPayment(mentor.user.id, {
        currency: 'USD',
        amount: 5000,
      })

      expect(usdPayment.currency).toBe('USD')
    })

    it('should update checkout session status to complete', async () => {
      const mentor = await createCompleteMentor()

      const payment = await createTestPayment(mentor.user.id, {
        stripeStatus: 'open',
        platformStatus: 'PENDING',
      })

      // Simulate successful checkout
      await testDb
        .update(schema.payment)
        .set({
          stripeStatus: 'complete',
          platformStatus: 'SUCCEEDED',
        })
        .where(eq(schema.payment.id, payment.id))

      const updated = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(updated?.stripeStatus).toBe('complete')
      expect(updated?.platformStatus).toBe('SUCCEEDED')
    })
  })

  describe('Payment Disputes', () => {
    it('should handle disputed payments', async () => {
      const mentor = await createCompleteMentor()

      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'SUCCEEDED',
      })

      // Simulate dispute
      await testDb
        .update(schema.payment)
        .set({ platformStatus: 'DISPUTED' })
        .where(eq(schema.payment.id, payment.id))

      await assertPaymentStatus(payment.id, 'DISPUTED')
    })

    it('should prevent transfers for disputed payments', async () => {
      const mentor = await createCompleteMentor()

      const payment = await createTestPayment(mentor.user.id, {
        platformStatus: 'DISPUTED',
      })

      const earnings = await getMentorEarnings(mentor.user.id)

      // Disputed payments should not count towards earnings
      expect(earnings.total).toBe(0)
      expect(earnings.succeededCount).toBe(0)
    })
  })

  describe('Payment Deletion and Cascades', () => {
    it('should cascade delete payment when mentor is deleted', async () => {
      const mentor = await createCompleteMentor()
      const payment = await createTestPayment(mentor.user.id)

      await testDb.delete(schema.user).where(eq(schema.user.id, mentor.user.id))

      const deletedPayment = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(deletedPayment).toBeUndefined()
    })
  })

  describe('Bulk Payment Operations', () => {
    it('should retrieve all payments for transfer processing', async () => {
      const mentor1 = await createCompleteMentor()
      const mentor2 = await createCompleteMentor()

      const sevenDaysAgo = pastDate(7)

      // Payments eligible for transfer
      await createTestPayment(mentor1.user.id, {
        platformStatus: 'SUCCEEDED',
        disputePeriodEnds: sevenDaysAgo,
      })

      await createTestPayment(mentor2.user.id, {
        platformStatus: 'SUCCEEDED',
        disputePeriodEnds: sevenDaysAgo,
      })

      // Payment not yet eligible
      await createTestPayment(mentor1.user.id, {
        platformStatus: 'SUCCEEDED',
        disputePeriodEnds: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const now = new Date()
      const eligiblePayments = await testDb.query.payment.findMany()

      const readyForTransfer = eligiblePayments.filter(
        p => p.platformStatus === 'SUCCEEDED' && !p.transferId && p.disputePeriodEnds <= now
      )

      expect(readyForTransfer).toHaveLength(2)
    })
  })
})
