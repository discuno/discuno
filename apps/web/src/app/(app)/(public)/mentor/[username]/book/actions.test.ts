/** @vitest-environment node */

import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type BookingFormInput } from './actions'

// Mock dependencies using vi.mock which is not hoisted
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}

vi.mock('~/server/db', () => ({
  db: mockDb,
}))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  },
}))

vi.mock('~/lib/calcom', () => ({
  createCalcomBooking: vi.fn(),
}))

// Dynamically import after mocks are set
const { createStripePaymentIntent, handlePaymentIntentWebhook, refundStripePaymentIntent } =
  await import('./actions')
const { stripe } = await import('~/lib/stripe')
const { createCalcomBooking } = await import('~/lib/calcom')
const { payments } = await import('~/server/db/schema')

describe('Booking Actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createStripePaymentIntent', () => {
    const validInput: BookingFormInput = {
      eventTypeId: 1,
      eventTypeSlug: '30-min',
      startTimeIso: new Date().toISOString(),
      attendeeName: 'Test User',
      attendeeEmail: 'test@example.com',
      mentorUsername: 'testmentor',
      mentorUserId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      price: 5000, // $50.00
      currency: 'USD',
      timeZone: 'America/New_York',
    }

    it('should create a payment intent successfully on the happy path', async () => {
      const mockStripeAccount = {
        userId: validInput.mentorUserId,
        stripeAccountId: 'acct_12345',
      }
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'pi_123_secret_456',
      }

      mockDb.limit.mockResolvedValue([mockStripeAccount])
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue(mockPaymentIntent as never)

      const result = await createStripePaymentIntent(validInput)

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe(mockPaymentIntent.client_secret)
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5250, // 5000 + 5% mentee fee
          currency: 'USD',
        })
      )
    })

    it('should return success: false when Stripe payment intent creation fails', async () => {
      const mockStripeAccount = {
        userId: validInput.mentorUserId,
        stripeAccountId: 'acct_12345',
      }
      mockDb.limit.mockResolvedValue([mockStripeAccount])
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(new Error('Stripe error'))

      const result = await createStripePaymentIntent(validInput)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create payment session.')
    })

    it('should return success: false if mentor has no stripe account', async () => {
      mockDb.limit.mockResolvedValue([])
      const result = await createStripePaymentIntent(validInput)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Mentor has not set up payments')
    })
  })

  describe('handlePaymentIntentWebhook', () => {
    const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
      id: 'pi_12345',
      amount: 5250,
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        mentorUserId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        attendeeEmail: 'test@example.com',
        attendeeName: 'Test User',
        mentorFee: '500',
        menteeFee: '250',
        mentorAmount: '4500',
        mentorUsername: 'testmentor',
        startTime: new Date().toISOString(),
        attendeeTimeZone: 'America/New_York',
        mentorStripeAccountId: 'acct_12345',
        eventTypeId: '1',
      },
    }

    it('should handle successful payment and booking (happy path)', async () => {
      const mockPaymentRecord = { id: 1, ...mockPaymentIntent }
      mockDb.returning.mockResolvedValue([mockPaymentRecord])
      vi.mocked(createCalcomBooking).mockResolvedValue({ id: 123, uid: 'cal_123' })

      const result = await handlePaymentIntentWebhook(mockPaymentIntent as Stripe.PaymentIntent)

      expect(result.success).toBe(true)
      expect(mockDb.insert).toHaveBeenCalledWith(payments)
      expect(createCalcomBooking).toHaveBeenCalled()
    })

    it('should handle Cal.com booking failure and trigger a refund', async () => {
      const mockPaymentRecord = { id: 1, ...mockPaymentIntent }
      mockDb.returning.mockResolvedValue([mockPaymentRecord])
      vi.mocked(createCalcomBooking).mockRejectedValue(new Error('Cal.com is down'))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: 're_123' } as never)

      const result = await handlePaymentIntentWebhook(mockPaymentIntent as Stripe.PaymentIntent)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create booking, payment has been refunded.')
      expect(createCalcomBooking).toHaveBeenCalled()
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: mockPaymentIntent.id,
        reason: 'requested_by_customer',
      })
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ platformStatus: 'FAILED' }))
    })
  })

  describe('refundStripePaymentIntent', () => {
    it('should successfully refund a payment and update the database', async () => {
      const paymentIntentId = 'pi_123'
      const reason = 'requested_by_customer'
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: 're_123' } as never)

      const result = await refundStripePaymentIntent(paymentIntentId, reason)

      expect(result.success).toBe(true)
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        reason,
      })
      expect(mockDb.set).toHaveBeenCalledWith({
        platformStatus: 'REFUNDED',
        stripeStatus: 'canceled',
      })
    })
  })
})
