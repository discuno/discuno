import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import * as schema from '~/server/db/schema'
import {
  createTestBooking,
  createTestMentor,
  createTestPayment,
  createTestUser,
  resetCounters,
} from '../fixtures'
import {
  assertPayment,
  assertRecentDate,
  calculateMentorAmount,
  calculatePlatformFee,
  pastDate,
} from '../helpers'

describe('Payment Processing Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('Payment Creation', () => {
    it('should create a payment for a booking', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        amount: 5000, // $50.00
        currency: 'USD',
        status: 'succeeded',
      })

      assertPayment(payment, {
        amount: 5000,
        status: 'succeeded',
        platformFeeAmount: 500,
        mentorAmount: 4500,
      })

      expect(payment.bookingId).toBe(booking.id)
      assertRecentDate(payment.createdAt)
    })

    it('should calculate platform fee correctly (10%)', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const amount = 10000 // $100.00
      const expectedPlatformFee = calculatePlatformFee(amount)
      const expectedMentorAmount = calculateMentorAmount(amount)

      const payment = await createTestPayment(booking.id, {
        amount,
        platformFeeAmount: expectedPlatformFee,
        mentorAmount: expectedMentorAmount,
      })

      expect(payment.platformFeeAmount).toBe(1000) // $10.00
      expect(payment.mentorAmount).toBe(9000) // $90.00
      expect(payment.platformFeeAmount + payment.mentorAmount).toBe(amount)
    })

    it('should handle different payment amounts', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const testAmounts = [2500, 5000, 7500, 10000, 15000] // $25, $50, $75, $100, $150

      for (const amount of testAmounts) {
        const booking = await createTestBooking(mentor.id, student.id)
        const payment = await createTestPayment(booking.id, {
          amount,
          platformFeeAmount: calculatePlatformFee(amount),
          mentorAmount: calculateMentorAmount(amount),
        })

        expect(payment.amount).toBe(amount)
        expect(payment.platformFeeAmount + payment.mentorAmount).toBe(amount)
      }
    })

    it('should support multiple currencies', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking1 = await createTestBooking(mentor.id, student.id)
      const booking2 = await createTestBooking(mentor.id, student.id)

      const usdPayment = await createTestPayment(booking1.id, {
        amount: 5000,
        currency: 'USD',
      })

      const eurPayment = await createTestPayment(booking2.id, {
        amount: 4500,
        currency: 'EUR',
      })

      expect(usdPayment.currency).toBe('USD')
      expect(eurPayment.currency).toBe('EUR')
    })
  })

  describe('Payment Status Lifecycle', () => {
    it('should track payment through lifecycle stages', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      // 1. Create pending payment
      let payment = await createTestPayment(booking.id, {
        status: 'pending',
        transferStatus: null,
      })

      assertPayment(payment, {
        status: 'pending',
        transferStatus: null,
      })

      // 2. Update to processing
      await testDb
        .update(schema.payment)
        .set({ status: 'processing' })
        .where(eq(schema.payment.id, payment.id))

      payment = (await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      }))!

      assertPayment(payment, { status: 'processing' })

      // 3. Update to succeeded
      await testDb
        .update(schema.payment)
        .set({ status: 'succeeded' })
        .where(eq(schema.payment.id, payment.id))

      payment = (await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      }))!

      assertPayment(payment, { status: 'succeeded' })

      // 4. Update transfer status to pending
      await testDb
        .update(schema.payment)
        .set({ transferStatus: 'pending' })
        .where(eq(schema.payment.id, payment.id))

      payment = (await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      }))!

      assertPayment(payment, { transferStatus: 'pending' })

      // 5. Update transfer status to transferred
      await testDb
        .update(schema.payment)
        .set({ transferStatus: 'transferred', transferredAt: new Date() })
        .where(eq(schema.payment.id, payment.id))

      payment = (await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      }))!

      assertPayment(payment, { transferStatus: 'transferred' })
      expect(payment.transferredAt).toBeTruthy()
    })

    it('should handle payment failures', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        status: 'failed',
      })

      assertPayment(payment, { status: 'failed' })

      // Verify no transfer status is set for failed payments
      expect(payment.transferStatus).toBeNull()
      expect(payment.transferredAt).toBeNull()
    })

    it('should handle payment refunds', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        status: 'succeeded',
      })

      // Process refund
      await testDb
        .update(schema.payment)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
        })
        .where(eq(schema.payment.id, payment.id))

      const refunded = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(refunded?.status).toBe('refunded')
      assertRecentDate(refunded?.refundedAt ?? null)
    })
  })

  describe('Stripe Payment Integration', () => {
    it('should store Stripe checkout session ID', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const sessionId = 'cs_test_abc123xyz'
      const payment = await createTestPayment(booking.id, {
        stripeCheckoutSessionId: sessionId,
      })

      expect(payment.stripeCheckoutSessionId).toBe(sessionId)
    })

    it('should store Stripe payment intent ID', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const paymentIntentId = 'pi_test_123abc'
      const payment = await createTestPayment(booking.id, {
        stripePaymentIntentId: paymentIntentId,
      })

      expect(payment.stripePaymentIntentId).toBe(paymentIntentId)
    })

    it('should store Stripe transfer ID after payout', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        status: 'succeeded',
        transferStatus: 'transferred',
        transferredAt: new Date(),
      })

      const transferId = 'tr_test_transfer123'
      await testDb
        .update(schema.payment)
        .set({ stripeTransferId: transferId })
        .where(eq(schema.payment.id, payment.id))

      const updated = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(updated?.stripeTransferId).toBe(transferId)
    })
  })

  describe('Payment Queries and Analytics', () => {
    it('should query all payments for a mentor', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking1 = await createTestBooking(mentor.id, student.id)
      const booking2 = await createTestBooking(mentor.id, student.id)
      const booking3 = await createTestBooking(mentor.id, student.id)

      await createTestPayment(booking1.id)
      await createTestPayment(booking2.id)
      await createTestPayment(booking3.id)

      const payments = await testDb.query.payment.findMany({
        with: {
          booking: {
            with: {
              organizer: true,
            },
          },
        },
      })

      const mentorPayments = payments.filter(p => p.booking.organizer?.userId === mentor.id)
      expect(mentorPayments).toHaveLength(3)
    })

    it('should calculate total earnings for a mentor', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking1 = await createTestBooking(mentor.id, student.id)
      const booking2 = await createTestBooking(mentor.id, student.id)
      const booking3 = await createTestBooking(mentor.id, student.id)

      await createTestPayment(booking1.id, { amount: 5000, status: 'succeeded' })
      await createTestPayment(booking2.id, { amount: 7500, status: 'succeeded' })
      await createTestPayment(booking3.id, { amount: 10000, status: 'succeeded' })

      const payments = await testDb.query.payment.findMany({
        where: eq(schema.payment.status, 'succeeded'),
        with: {
          booking: {
            with: {
              organizer: true,
            },
          },
        },
      })

      const mentorPayments = payments.filter(p => p.booking.organizer?.userId === mentor.id)
      const totalEarnings = mentorPayments.reduce((sum, p) => sum + p.mentorAmount, 0)
      const totalPlatformFees = mentorPayments.reduce((sum, p) => sum + p.platformFeeAmount, 0)

      expect(totalEarnings).toBe(20250) // $202.50 (90% of $225)
      expect(totalPlatformFees).toBe(2250) // $22.50 (10% of $225)
    })

    it('should filter payments by status', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      const booking1 = await createTestBooking(mentor.id, student.id)
      const booking2 = await createTestBooking(mentor.id, student.id)
      const booking3 = await createTestBooking(mentor.id, student.id)
      const booking4 = await createTestBooking(mentor.id, student.id)

      await createTestPayment(booking1.id, { status: 'succeeded' })
      await createTestPayment(booking2.id, { status: 'succeeded' })
      await createTestPayment(booking3.id, { status: 'pending' })
      await createTestPayment(booking4.id, { status: 'failed' })

      const succeededPayments = await testDb.query.payment.findMany({
        where: eq(schema.payment.status, 'succeeded'),
      })

      const pendingPayments = await testDb.query.payment.findMany({
        where: eq(schema.payment.status, 'pending'),
      })

      const failedPayments = await testDb.query.payment.findMany({
        where: eq(schema.payment.status, 'failed'),
      })

      expect(succeededPayments).toHaveLength(2)
      expect(pendingPayments).toHaveLength(1)
      expect(failedPayments).toHaveLength(1)
    })

    it('should query payments ready for transfer (after dispute period)', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()

      // Booking completed 8 days ago (past dispute period)
      const oldBooking = await createTestBooking(mentor.id, student.id, {
        startTime: pastDate(8),
        endTime: new Date(pastDate(8).getTime() + 30 * 60 * 1000),
        status: 'ACCEPTED',
      })

      // Booking completed 3 days ago (within dispute period)
      const recentBooking = await createTestBooking(mentor.id, student.id, {
        startTime: pastDate(3),
        endTime: new Date(pastDate(3).getTime() + 30 * 60 * 1000),
        status: 'ACCEPTED',
      })

      await createTestPayment(oldBooking.id, {
        status: 'succeeded',
        transferStatus: null,
      })

      await createTestPayment(recentBooking.id, {
        status: 'succeeded',
        transferStatus: null,
      })

      // Query payments where booking ended > 7 days ago
      const disputePeriodEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const paymentsReadyForTransfer = await testDb.query.payment.findMany({
        where: (payments, { and, eq, isNull, lt }) =>
          and(
            eq(payments.status, 'succeeded'),
            isNull(payments.transferStatus),
            lt(payments.createdAt, disputePeriodEnd)
          ),
      })

      expect(paymentsReadyForTransfer).toHaveLength(1)
    })
  })

  describe('Payment and Booking Relations', () => {
    it('should query booking with payment information', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)
      await createTestPayment(booking.id)

      const bookingWithPayment = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
        with: {
          payment: true,
          eventType: true,
          organizer: true,
        },
      })

      expect(bookingWithPayment?.payment).toBeTruthy()
      expect(bookingWithPayment?.eventType).toBeTruthy()
      expect(bookingWithPayment?.organizer).toBeTruthy()
    })

    it('should handle bookings without payments', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const bookingWithoutPayment = await testDb.query.booking.findFirst({
        where: eq(schema.booking.id, booking.id),
        with: {
          payment: true,
        },
      })

      expect(bookingWithoutPayment?.payment).toBeUndefined()
    })
  })

  describe('Payment Metadata', () => {
    it('should store payment metadata', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const metadata = {
        customerEmail: 'student@example.com',
        promotionCode: 'FIRST10',
        source: 'web',
      }

      const [payment] = await testDb
        .insert(schema.payment)
        .values({
          bookingId: booking.id,
          stripeCheckoutSessionId: 'cs_test_123',
          stripePaymentIntentId: 'pi_test_123',
          amount: 5000,
          currency: 'USD',
          status: 'succeeded',
          platformFeeAmount: 500,
          mentorAmount: 4500,
          metadata,
        })
        .returning()

      expect(payment?.metadata).toEqual(metadata)
    })
  })

  describe('Payment Edge Cases', () => {
    it('should handle zero-amount payments (free consultations)', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        amount: 0,
        platformFeeAmount: 0,
        mentorAmount: 0,
      })

      expect(payment.amount).toBe(0)
      expect(payment.platformFeeAmount).toBe(0)
      expect(payment.mentorAmount).toBe(0)
    })

    it('should cascade delete payment when booking is deleted', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)
      const payment = await createTestPayment(booking.id)

      await testDb.delete(schema.booking).where(eq(schema.booking.id, booking.id))

      const deletedPayment = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(deletedPayment).toBeUndefined()
    })

    it('should handle partial refunds', async () => {
      const mentor = await createTestMentor()
      const student = await createTestUser()
      const booking = await createTestBooking(mentor.id, student.id)

      const payment = await createTestPayment(booking.id, {
        amount: 10000, // $100.00
        status: 'succeeded',
      })

      // Refund half the amount
      const refundAmount = 5000
      await testDb
        .update(schema.payment)
        .set({
          metadata: { refundAmount },
          refundedAt: new Date(),
        })
        .where(eq(schema.payment.id, payment.id))

      const refunded = await testDb.query.payment.findFirst({
        where: eq(schema.payment.id, payment.id),
      })

      expect(refunded?.metadata).toHaveProperty('refundAmount', 5000)
    })
  })
})
