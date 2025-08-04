/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'
import type { Stripe } from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStripePaymentIntent,
  handlePaymentIntentWebhook,
  refundStripePaymentIntent,
  type BookingFormInput,
} from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { POST as calcomWebhookHandler } from '~/app/api/webhooks/cal/route'
import { POST as stripeWebhookHandler } from '~/app/api/webhooks/stripe/route'
import { createCalcomBooking } from '~/lib/calcom'
import type { CalcomWebhookEvent } from '~/lib/schemas/calcom'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import * as queries from '~/server/queries'

vi.mock('~/server/db', () => {
  const mockQueryChain = {
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

  return {
    db: {
      select: vi.fn(() => mockQueryChain),
      insert: vi.fn(() => mockQueryChain),
      update: vi.fn(() => mockQueryChain),
    },
  }
})

// Mock stripe and actions
vi.mock('~/lib/stripe')
vi.mock('~/server/queries', async () => {
  const actual = await vi.importActual('~/server/queries')
  return {
    ...actual,
    createLocalBooking: vi.fn(),
  }
})

// Mock the calcom module
vi.mock('~/lib/calcom', () => ({
  createCalcomBooking: vi.fn(),
}))

// Mock the actions module partially
vi.mock('~/app/(app)/(public)/mentor/[username]/book/actions', async () => {
  const actual = await vi.importActual('~/app/(app)/(public)/mentor/[username]/book/actions')
  return {
    ...actual,
    refundStripePaymentIntent: vi.fn(),
  }
})

describe('Checkout Flow E2E', () => {
  // Helper to get the mocked db query chain
  const getMockQueryChain = () => {
    const mockDb = vi.mocked(db)
    // Get the mock query chain that's returned by db.select()
    const mockSelectResult = mockDb.select()
    return mockSelectResult as any
  }

  const getMockInsertChain = () => {
    const mockDb = vi.mocked(db)
    // Get the mock query chain that's returned by db.insert()
    const mockInsertResult = mockDb.insert({} as any)
    return mockInsertResult as any
  }

  const getMockUpdateChain = () => {
    const mockDb = vi.mocked(db)
    // Get the mock query chain that's returned by db.update()
    const mockUpdateResult = mockDb.update({} as any)
    return mockUpdateResult as any
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  // Restore mocks after each test
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should create a Stripe payment intent successfully', async () => {
    // Mock the database response for the mentor's stripe account
    const mockStripeAccount = {
      userId: 'user_2jclO8iTFUa1v6p2qE5M9bN3gXy',
      stripeAccountId: 'acct_123456789',
    }

    // Mock the entire query chain
    const mockQueryChain = getMockQueryChain()
    mockQueryChain.limit.mockResolvedValue([mockStripeAccount])

    const bookingInput: BookingFormInput = {
      eventTypeId: 1,
      startTimeIso: new Date().toISOString(),
      attendeeName: 'Test User',
      attendeeEmail: 'test@example.com',
      mentorUsername: 'testmentor',
      mentorUserId: 'user_2jclO8iTFUa1v6p2qE5M9bN3gXy',
      price: 5000, // $50.00 in cents
      currency: 'USD',
      timeZone: 'America/New_York',
    }

    const result = await createStripePaymentIntent(bookingInput)

    expect(result.success).toBe(true)
    expect(result.clientSecret).toBeDefined()
    expect(typeof result.clientSecret).toBe('string')
  })

  it('should successfully complete the entire checkout flow', async () => {
    // 1. Setup initial data and mocks
    const startTime = new Date()
    const mentorUserId = 'user_mentor123'
    const stripeAccountId = 'acct_stripe123'
    const paymentIntentId = 'pi_test_123'
    const clientSecret = 'pi_test_123_secret_abc'
    const paymentId = 999
    const calcomBookingId = 12345
    const calcomUid = 'cal_uid_123'

    const bookingInput: BookingFormInput = {
      eventTypeId: 1,
      startTimeIso: startTime.toISOString(),
      attendeeName: 'E2E Test User',
      attendeeEmail: 'e2e@example.com',
      mentorUsername: 'e2ementor',
      mentorUserId,
      price: 5000,
      currency: 'USD',
      timeZone: 'America/New_York',
    }

    // Mock DB select for mentor's stripe account
    const mockQueryChain = getMockQueryChain()
    mockQueryChain.limit.mockResolvedValue([{ userId: mentorUserId, stripeAccountId }])

    // Mock Stripe payment intent creation
    const mockPaymentIntent = {
      id: paymentIntentId,
      client_secret: clientSecret,
      amount: 5250,
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        mentorUserId,
        eventTypeId: bookingInput.eventTypeId.toString(),
        startTime: bookingInput.startTimeIso,
        attendeeName: bookingInput.attendeeName,
        attendeeEmail: bookingInput.attendeeEmail,
        attendeeTimeZone: bookingInput.timeZone,
        mentorUsername: bookingInput.mentorUsername,
        mentorFee: '500',
        menteeFee: '250',
        mentorAmount: '4500',
        mentorStripeAccountId: stripeAccountId,
      },
    }
    ;(stripe.paymentIntents.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaymentIntent)

    // 2. Step 1: User initiates booking, creates payment intent
    const intentResult = await createStripePaymentIntent(bookingInput)
    expect(intentResult.success).toBe(true)
    expect(intentResult.clientSecret).toBe(clientSecret)
    expect(stripe.paymentIntents.create).toHaveBeenCalled()

    // 3. Step 2: Stripe sends a `payment_intent.succeeded` webhook
    const mockStripeWebhookEvent = {
      type: 'payment_intent.succeeded',
      data: { object: mockPaymentIntent },
    } as unknown as Stripe.Event

    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStripeWebhookEvent
    )

    // Mock DB insert for the new payment record
    const mockInsertChain = getMockInsertChain()
    mockInsertChain.returning.mockResolvedValue([{ id: paymentId }])

    // Mock Cal.com booking creation
    ;(createCalcomBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      uid: calcomUid,
      bookingId: calcomBookingId,
    })

    const stripeWebhookRequest = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'test_signature' },
      body: JSON.stringify(mockStripeWebhookEvent),
    })
    stripeWebhookRequest.arrayBuffer = async () =>
      new TextEncoder().encode(JSON.stringify(mockStripeWebhookEvent)).buffer

    const stripeResponse = await stripeWebhookHandler(stripeWebhookRequest)
    expect(stripeResponse.status).toBe(200)

    // Assertions for step 3 (handlePaymentIntentWebhook logic)
    expect(vi.mocked(db).insert).toHaveBeenCalled()
    expect(createCalcomBooking).toHaveBeenCalledWith({
      calcomEventTypeId: bookingInput.eventTypeId,
      start: bookingInput.startTimeIso,
      attendeeName: bookingInput.attendeeName,
      attendeeEmail: bookingInput.attendeeEmail,
      timeZone: bookingInput.timeZone,
      stripePaymentIntentId: paymentIntentId,
      paymentId: paymentId,
      mentorUserId: mentorUserId,
    })

    // 4. Step 4: Cal.com sends a `BOOKING_CREATED` webhook
    const mockCalcomWebhookPayload: CalcomWebhookEvent = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: new Date().toISOString(),
      payload: {
        bookingId: calcomBookingId,
        uid: calcomUid,
        type: '30_min_session',
        title: '30 min between E2E Test User and e2ementor',
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
        attendees: [
          {
            name: bookingInput.attendeeName,
            email: bookingInput.attendeeEmail,
            timeZone: bookingInput.timeZone,
          },
        ],
        organizer: {
          id: 1,
          name: 'e2ementor',
          email: 'mentor@example.com',
          username: 'e2ementor',
          timeZone: 'America/New_York',
        },
        status: 'ACCEPTED',
        eventTypeId: bookingInput.eventTypeId,
        price: bookingInput.price / 100,
        currency: bookingInput.currency,
        length: 30,
        metadata: {
          stripePaymentIntentId: paymentIntentId,
          mentorUserId: mentorUserId,
          paymentId: paymentId.toString(),
        },
        destinationCalendar: {
          id: 1,
          integration: 'google',
          externalId: 'cal-ext-id',
          userId: 1,
          eventTypeId: 1,
          credentialId: 1,
        },
        location: 'Online',
        responses: [],
      },
    }

    const secret = 'test-secret'
    process.env.CALCOM_WEBHOOK_SECRET = secret

    const calcomBodyText = JSON.stringify(mockCalcomWebhookPayload)
    const calcomSignature = crypto.createHmac('sha256', secret).update(calcomBodyText).digest('hex')

    const calcomWebhookRequest = new Request('http://localhost/api/webhooks/cal', {
      method: 'POST',
      headers: { 'x-cal-signature-256': calcomSignature },
      body: calcomBodyText,
    })
    calcomWebhookRequest.text = async () => calcomBodyText

    // Mock the final DB update (createLocalBooking)
    ;(queries.createLocalBooking as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 12345 })

    const calcomResponse = await calcomWebhookHandler(calcomWebhookRequest)
    expect(calcomResponse.status).toBe(201)

    // 5. Step 5: Final assertions
    expect(queries.createLocalBooking).toHaveBeenCalled()
    const [attendee] = mockCalcomWebhookPayload.payload.attendees
    expect(queries.createLocalBooking).toHaveBeenCalledWith({
      calcomBookingId: mockCalcomWebhookPayload.payload.bookingId,
      calcomUid: mockCalcomWebhookPayload.payload.uid,
      title: mockCalcomWebhookPayload.payload.title,
      startTime: new Date(mockCalcomWebhookPayload.payload.startTime),
      duration: mockCalcomWebhookPayload.payload.length,
      organizerUserId: mockCalcomWebhookPayload.payload.metadata.mentorUserId,
      calcomOrganizerEmail: mockCalcomWebhookPayload.payload.organizer.email,
      calcomOrganizerUsername: mockCalcomWebhookPayload.payload.organizer.username,
      calcomOrganizerName: mockCalcomWebhookPayload.payload.organizer.name,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      attendeeTimeZone: attendee.timeZone,
      price: mockCalcomWebhookPayload.payload.price,
      currency: mockCalcomWebhookPayload.payload.currency,
      mentorEventTypeId: mockCalcomWebhookPayload.payload.eventTypeId,
      paymentId: Number(mockCalcomWebhookPayload.payload.metadata.paymentId),
      requiresPayment: true,
    })
  })

  it('should create a Cal.com booking after a successful payment', async () => {
    const mockPaymentIntent: Stripe.PaymentIntent = {
      id: 'pi_123',
      object: 'payment_intent',
      amount: 5500,
      amount_capturable: 0,
      amount_details: { tip: {} },
      amount_received: 5500,
      application: null,
      application_fee_amount: null,
      automatic_payment_methods: { enabled: true },
      canceled_at: null,
      cancellation_reason: null,
      capture_method: 'automatic',
      client_secret: 'pi_123_secret_abc',
      confirmation_method: 'automatic',
      created: Date.now() / 1000,
      currency: 'usd',
      customer: null,
      description: null,
      last_payment_error: null,
      latest_charge: 'ch_123',
      livemode: false,
      metadata: {
        mentorUserId: 'user_2jclO8iTFUa1v6p2qE5M9bN3gXy',
        attendeeEmail: 'test@example.com',
        attendeeName: 'Test User',
        mentorFee: '500',
        menteeFee: '250',
        mentorAmount: '4500',
        mentorUsername: 'testmentor',
        startTime: new Date().toISOString(),
        attendeeTimeZone: 'America/New_York',
        mentorStripeAccountId: 'acct_123456789',
        eventTypeId: '1',
      },
      next_action: null,
      on_behalf_of: null,
      payment_method: 'pm_123',
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
          installments: null,
          mandate_options: null,
          network: null,
        },
      },
      payment_method_types: ['card'],
      payment_method_configuration_details: null,
      processing: null,
      receipt_email: null,
      review: null,
      setup_future_usage: null,
      shipping: null,
      source: null,
      statement_descriptor: null,
      statement_descriptor_suffix: null,
      status: 'succeeded',
      transfer_data: null,
      transfer_group: null,
    }

    const mockInsertChain = getMockInsertChain()
    mockInsertChain.returning.mockResolvedValue([{ id: 'payment_123' }])
    ;(createCalcomBooking as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })

    const result = await handlePaymentIntentWebhook(mockPaymentIntent)

    expect(createCalcomBooking).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('should refund payment and update db if Cal.com booking fails', async () => {
    const mockPaymentIntent: Stripe.PaymentIntent = {
      id: 'pi_456',
      object: 'payment_intent',
      amount: 5500,
      amount_capturable: 0,
      amount_details: { tip: {} },
      amount_received: 5500,
      application: null,
      application_fee_amount: null,
      automatic_payment_methods: { enabled: true },
      canceled_at: null,
      cancellation_reason: null,
      capture_method: 'automatic',
      client_secret: 'pi_456_secret_def',
      confirmation_method: 'automatic',
      created: Date.now() / 1000,
      currency: 'usd',
      customer: null,
      description: null,
      last_payment_error: null,
      latest_charge: 'ch_456',
      livemode: false,
      metadata: {
        mentorUserId: 'user_2jclO8iTFUa1v6p2qE5M9bN3gXy',
        attendeeEmail: 'test@example.com',
        attendeeName: 'Test User',
        mentorFee: '500',
        menteeFee: '250',
        mentorAmount: '4500',
        mentorUsername: 'testmentor',
        startTime: new Date().toISOString(),
        attendeeTimeZone: 'America/New_York',
        mentorStripeAccountId: 'acct_123456789',
        eventTypeId: '1',
      },
      next_action: null,
      on_behalf_of: null,
      payment_method: 'pm_456',
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
          installments: null,
          mandate_options: null,
          network: null,
        },
      },
      payment_method_types: ['card'],
      payment_method_configuration_details: null,
      processing: null,
      receipt_email: null,
      review: null,
      setup_future_usage: null,
      shipping: null,
      source: null,
      statement_descriptor: null,
      statement_descriptor_suffix: null,
      status: 'succeeded',
      transfer_data: null,
      transfer_group: null,
    }

    const mockInsertChain2 = getMockInsertChain()
    mockInsertChain2.returning.mockResolvedValue([{ id: 'payment_456' }])
    ;(createCalcomBooking as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Booking failed')
    )
    ;(refundStripePaymentIntent as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
    const mockUpdateChain = getMockUpdateChain()
    mockUpdateChain.where.mockResolvedValue(undefined)

    const result = await handlePaymentIntentWebhook(mockPaymentIntent)

    expect(createCalcomBooking).toHaveBeenCalled()
    expect(refundStripePaymentIntent).toHaveBeenCalledWith('pi_456', 'requested_by_customer')
    expect(vi.mocked(db).update).toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to create booking, payment has been refunded.')
  })

  it('should handle a payment_intent.succeeded webhook event', async () => {
    const mockPaymentIntent = {
      id: 'pi_123',
      // Add other necessary fields that the handler uses
      metadata: {
        mentorUserId: 'user_2jclO8iTFUa1v6p2qE5M9bN3gXy',
        attendeeEmail: 'test@example.com',
        attendeeName: 'Test User',
        mentorFee: '500',
        menteeFee: '250',
        mentorAmount: '4500',
        mentorUsername: 'testmentor',
        startTime: new Date().toISOString(),
        attendeeTimeZone: 'America/New_York',
        mentorStripeAccountId: 'acct_123456789',
        eventTypeId: '1',
      },
      amount: 5500,
      currency: 'usd',
      status: 'succeeded',
    }
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: mockPaymentIntent,
      },
    } as unknown as Stripe.Event

    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
    ;(handlePaymentIntentWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })

    const mockRequest = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: JSON.stringify(mockEvent),
    })

    // Mock arrayBuffer to simulate the raw body for the webhook handler
    const originalArrayBuffer = mockRequest.arrayBuffer
    mockRequest.arrayBuffer = async () => new TextEncoder().encode(JSON.stringify(mockEvent)).buffer

    const response = await stripeWebhookHandler(mockRequest)
    const responseBody = await response.json()

    expect(stripe.webhooks.constructEvent).toHaveBeenCalled()
    expect(handlePaymentIntentWebhook).toHaveBeenCalledWith(mockPaymentIntent)
    expect(response.status).toBe(200)
    expect(responseBody).toEqual({ received: true })

    // Restore original method
    mockRequest.arrayBuffer = originalArrayBuffer
  })

  it('should handle a BOOKING_CREATED event from Cal.com', async () => {
    const secret = 'test-secret'
    process.env.CALCOM_WEBHOOK_SECRET = secret

    const mockPayload: CalcomWebhookEvent = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: new Date().toISOString(),
      payload: {
        bookingId: 123,
        uid: 'test-uid',
        type: 'ONE_ON_ONE',
        status: 'ACCEPTED',
        title: 'Test Booking',
        attendees: [
          {
            name: 'Test Attendee',
            email: 'attendee@example.com',
            timeZone: 'America/New_York',
          },
        ],
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        length: 30,
        organizer: {
          id: 1,
          name: 'Test Mentor',
          email: 'mentor@example.com',
          username: 'testmentor',
          timeZone: 'America/New_York',
        },
        responses: [],
        eventTypeId: 1,
        price: 50,
        currency: 'USD',
        metadata: {
          stripePaymentIntentId: 'pi_test_123',
          mentorUserId: 'user_mentor123',
          paymentId: '456',
        },
        location: 'Online',
        destinationCalendar: {
          id: 123,
          integration: 'google',
          externalId: 'https://calendar.google.com/calendar/123',
          userId: 1,
          eventTypeId: 1,
          credentialId: 1,
        },
      },
    }

    const bodyText = JSON.stringify(mockPayload)
    const signature = crypto.createHmac('sha256', secret).update(bodyText).digest('hex')

    const mockRequest = new Request('http://localhost/api/webhooks/cal', {
      method: 'POST',
      headers: {
        'x-cal-signature-256': signature,
      },
      body: bodyText,
    })

    // Mock the text() method to return the body
    const originalText = mockRequest.text
    mockRequest.text = async () => bodyText
    ;(queries.createLocalBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 999,
    })

    const response = await calcomWebhookHandler(mockRequest)
    const responseBody = await response.json()

    expect(response.status).toBe(201)
    expect(responseBody).toBeDefined()
    expect(queries.createLocalBooking).toHaveBeenCalled()

    const { payload } = mockPayload
    const [attendee] = payload.attendees

    expect(queries.createLocalBooking).toHaveBeenCalledWith({
      calcomBookingId: payload.bookingId,
      calcomUid: payload.uid,
      title: payload.title,
      startTime: new Date(payload.startTime),
      duration: payload.length,
      organizerUserId: payload.metadata.mentorUserId,
      calcomOrganizerEmail: payload.organizer.email,
      calcomOrganizerUsername: payload.organizer.username,
      calcomOrganizerName: payload.organizer.name,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      attendeeTimeZone: attendee.timeZone,
      price: payload.price,
      currency: payload.currency,
      mentorEventTypeId: payload.eventTypeId,
      paymentId: Number(payload.metadata.paymentId),
      requiresPayment: true,
    })

    // Restore original method
    mockRequest.text = originalText
  })
})
