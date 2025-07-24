# Stripe Checkout with Manual Payouts Implementation Plan

## Overview

This plan implements a secure Stripe Checkout integration with manual payouts for the mentor booking flow. The system will:

1. Collect payment before booking confirmation
2. Hold funds on the platform for 72 hours for dispute resolution
3. Automatically release funds to mentors after the dispute period
4. Follow Next.js 2025 best practices using server actions

## Architecture Decision

### Payment Flow

1. **Customer pays** → Platform Stripe account (using Checkout Session)
2. **Funds held** → 72 hours on platform for dispute resolution
3. **Automatic payout** → Transfer to mentor's connected account after dispute period
4. **Manual intervention** → Admin can cancel payouts for disputes

### Key Components

- **Checkout Session**: Custom UI mode for embedded experience
- **Connected Accounts**: Express accounts for mentors with manual payouts
- **Transfers**: Move funds from platform to mentor accounts
- **Webhooks**: Handle payment events and update booking status

## Implementation Steps

### 1. Database Schema Updates

#### A. Add Payment Tracking Table

```sql
-- Add to schema.ts
export const payments = pgTable(
  'discuno_payment',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    stripePaymentIntentId: varchar({ length: 255 }).notNull().unique(),
    stripeCheckoutSessionId: varchar({ length: 255 }).notNull().unique(),
    bookingId: integer().references(() => bookings.id, { onDelete: 'cascade' }),
    mentorUserId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    customerEmail: varchar({ length: 255 }).notNull(),
    customerName: varchar({ length: 255 }).notNull(),
    amount: integer().notNull(), // in cents
    currency: varchar({ length: 3 }).notNull().default('USD'),
    platformFee: integer().notNull(), // in cents
    mentorAmount: integer().notNull(), // in cents (amount - platformFee)
    status: paymentStatusEnum().notNull().default('PENDING'),
    paymentStatus: varchar({ length: 50 }).notNull(), // Stripe payment status
    transferId: varchar({ length: 255 }), // Stripe transfer ID when funds sent to mentor
    transferStatus: varchar({ length: 50 }), // Transfer status
    transferRetryCount: integer().notNull().default(0), // Number of transfer retry attempts
    disputeRequested: boolean().notNull().default(false), // Admin flag to prevent auto-transfer
    disputePeriodEnds: timestamp({
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    metadata: jsonb().default('{}'),
    ...timestamps,
  },
  table => [
    index('payments_booking_id_idx').on(table.bookingId),
    index('payments_mentor_user_id_idx').on(table.mentorUserId),
    index('payments_status_idx').on(table.status),
    index('payments_dispute_period_ends_idx').on(table.disputePeriodEnds),
  ]
)

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'DISPUTED',
  'REFUNDED',
  'TRANSFERRED',
] as const)
```

#### B. Update Bookings Schema

```sql
-- Add payment reference to bookings
export const bookings = pgTable(
  'discuno_booking',
  {
    // ... existing fields
    paymentId: integer().references(() => payments.id, { onDelete: 'set null' }),
    requiresPayment: boolean().notNull().default(true),
    // ... rest of fields
  }
)
```

### 2. Server Actions for Checkout

#### A. Create Checkout Session Action

**File**: `src/app/(app)/(public)/mentor/[username]/book/actions/checkout.ts`

```typescript
'use server'

import { z } from 'zod'
import { stripe } from '~/lib/stripe'
import { getMentorEnabledEventTypes, getMentorStripeAccount } from '~/server/queries'

// Zod schema for input validation
const CreateCheckoutSessionSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  eventTypeId: z.number().int().positive('Event type ID must be a positive integer'),
  startTime: z.string().datetime('Invalid start time format'),
  attendee: z.object({
    name: z.string().min(1, 'Attendee name is required'),
    email: z.string().email('Invalid email format'),
    timeZone: z.string().min(1, 'Timezone is required'),
  }),
})

type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>

export const createCheckoutSession = async (input: CreateCheckoutSessionInput) => {
  // Validate input with Zod
  const validatedInput = CreateCheckoutSessionSchema.parse(input)

  // 1. Get mentor and event type details
  const mentor = await getMentorByUsername(validatedInput.username)
  const eventType = await getMentorEventTypeById(validatedInput.eventTypeId)
  const mentorStripeAccount = await getMentorStripeAccount(mentor.userId)

  if (!mentorStripeAccount?.chargesEnabled) {
    throw new Error('Mentor cannot accept payments')
  }

  // 2. Calculate amounts
  const amount = eventType.customPrice || eventType.defaultPrice // in cents
  const platformFeeRate = 0.1 // 10% platform fee
  const platformFee = Math.round(amount * platformFeeRate)
  const mentorAmount = amount - platformFee

  // 3. Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'custom',
    customer_email: validatedInput.attendee.email,
    billing_address_collection: 'auto',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${eventType.title} with ${mentor.name}`,
            description: `${eventType.duration} minute session`,
            metadata: {
              mentorId: mentor.userId,
              eventTypeId: eventType.id.toString(),
              startTime: validatedInput.startTime,
            },
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    return_url: `${env.NEXT_PUBLIC_BASE_URL}/mentor/${validatedInput.username}/book/complete?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      mentorUserId: mentor.userId,
      eventTypeId: validatedInput.eventTypeId.toString(),
      startTime: validatedInput.startTime,
      attendeeName: validatedInput.attendee.name,
      attendeeEmail: validatedInput.attendee.email,
      attendeeTimeZone: validatedInput.attendee.timeZone,
      platformFee: platformFee.toString(),
      mentorAmount: mentorAmount.toString(),
    },
  })

  return {
    clientSecret: session.client_secret!,
    sessionId: session.id,
  }
}
```

#### B. Handle Checkout Completion

```typescript
export const handleCheckoutComplete = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  // Check payment intent status instead of session payment_status
  const paymentIntent = session.payment_intent as Stripe.PaymentIntent

  if (paymentIntent.status === 'succeeded') {
    try {
      // 1. Create payment record
      const paymentId = await createPaymentRecord({
        stripePaymentIntentId: paymentIntent.id,
        stripeCheckoutSessionId: sessionId,
        // ... other fields from session.metadata
      })

      // 2. Create Cal.com booking
      const calcomBooking = await createCalcomBooking({
        // ... booking details from session.metadata
      })

      // 3. Create local booking record
      const booking = await createBookingRecord({
        paymentId,
        calcomBookingId: calcomBooking.id,
        // ... other fields
      })

      // 4. Send confirmation emails
      await sendBookingConfirmationEmail({
        attendeeEmail: session.metadata.attendeeEmail,
        mentorEmail: mentor.email,
        booking,
      })

      return { success: true, bookingId: booking.id }
    } catch (error) {
      // Handle booking creation failure with refund
      console.error('Booking creation failed:', error)

      try {
        await stripe.refunds.create({
          payment_intent: paymentIntent.id,
          reason: 'requested_by_customer',
          metadata: {
            reason: 'booking_creation_failed',
            sessionId,
          },
        })

        // Update payment status to refunded
        await updatePaymentStatus(sessionId, 'REFUNDED')

        // Send refund notification
        await sendRefundNotificationEmail({
          customerEmail: session.metadata.attendeeEmail,
          amount: paymentIntent.amount,
          reason: 'Booking creation failed',
        })
      } catch (refundError) {
        console.error('Refund failed:', refundError)
        // Alert admin for manual intervention
        await alertAdminForManualRefund(sessionId, error, refundError)
      }

      throw new Error('Booking creation failed and refund has been initiated')
    }
  }

  throw new Error('Payment not completed')
}
```

### 3. React Components

#### A. Enhanced Booking Flow with Checkout

**File**: `src/app/(app)/(public)/mentor/[username]/book/components/BookingWithCheckout.tsx`

```tsx
'use client'

import { loadStripe } from '@stripe/stripe-js'
import { CheckoutProvider } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { CheckoutForm } from './CheckoutForm'

interface BookingWithCheckoutProps {
  username: string
  eventType: EventType
}

// Memoize stripePromise at module level to avoid reloading on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export const BookingWithCheckout = ({ username, eventType }: BookingWithCheckoutProps) => {
  const [checkoutData, setCheckoutData] = useState(null)
  const [currentStep, setCurrentStep] = useState<'booking' | 'payment' | 'complete'>('booking')

  const handleBookingSubmit = async bookingDetails => {
    // 1. Create checkout session
    const { clientSecret, sessionId } = await createCheckoutSession({
      username,
      eventTypeId: eventType.id,
      ...bookingDetails,
    })

    setCheckoutData({ clientSecret, sessionId })
    setCurrentStep('payment')
  }

  const handlePaymentSuccess = async sessionId => {
    await handleCheckoutComplete(sessionId)
    setCurrentStep('complete')
  }

  return (
    <div className="space-y-6">
      {currentStep === 'booking' && (
        <BookingDetailsForm eventType={eventType} onSubmit={handleBookingSubmit} />
      )}

      {currentStep === 'payment' && checkoutData && (
        <CheckoutProvider
          stripe={stripePromise}
          options={{
            fetchClientSecret: () => Promise.resolve(checkoutData.clientSecret),
            elementsOptions: {
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: 'hsl(var(--primary))',
                },
              },
            },
          }}
        >
          <CheckoutForm
            onSuccess={() => handlePaymentSuccess(checkoutData.sessionId)}
            eventType={eventType}
          />
        </CheckoutProvider>
      )}

      {currentStep === 'complete' && <BookingSuccessMessage />}
    </div>
  )
}
```

#### B. Custom Checkout Form Component

```tsx
import { PaymentElement, AddressElement, useCheckout } from '@stripe/react-stripe-js'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface CheckoutFormProps {
  onSuccess: () => void
  eventType: EventType
}

export const CheckoutForm = ({ onSuccess, eventType }: CheckoutFormProps) => {
  const checkout = useCheckout()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()

    if (!checkout.canConfirm) return

    setIsLoading(true)

    try {
      const result = await checkout.confirm()

      if (result.error) {
        setMessage(result.error.message)
      } else {
        onSuccess()
      }
    } catch (error) {
      setMessage('An unexpected error occurred.')
    }

    setIsLoading(false)
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <div className="flex justify-between text-sm">
          <span>{eventType.title}</span>
          <span className="font-semibold">
            ${(checkout?.total?.total?.amount / 100).toFixed(2)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h4 className="mb-3 font-medium">Billing Address</h4>
            <AddressElement options={{ mode: 'billing' }} />
          </div>

          <div>
            <h4 className="mb-3 font-medium">Payment Method</h4>
            <PaymentElement />
          </div>

          <Button
            type="submit"
            disabled={!checkout?.canConfirm || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading
              ? 'Processing...'
              : `Pay $${(checkout?.total?.total?.amount / 100).toFixed(2)}`}
          </Button>

          {message && <div className="text-sm text-red-600">{message}</div>}
        </form>
      </CardContent>
    </Card>
  )
}
```

### 4. Webhook Handlers

#### A. Enhanced Stripe Webhook

**File**: `src/app/api/webhooks/stripe/route.ts`

```typescript
export async function POST(req: Request) {
  // ... existing webhook verification code

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object)
      break

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object)
      break

    case 'transfer.created':
      await handleTransferCreated(event.data.object)
      break

    case 'account.updated':
      await handleAccountUpdated(event.data.object)
      break

    // ... other cases
  }

  return NextResponse.json({ received: true })
}

const handleCheckoutSessionCompleted = async session => {
  // Update payment status and trigger booking creation
  await updatePaymentStatus(session.id, 'SUCCEEDED')

  // Schedule dispute period end
  const disputePeriodEnd = new Date()
  disputePeriodEnd.setHours(disputePeriodEnd.getHours() + 72)

  await scheduleAutoTransfer(session.id, disputePeriodEnd)
}
```

### 5. Auto-Transfer System

#### A. Cron Job for Auto Transfers

**File**: `src/app/api/cron/transfer-funds/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { eq, and, lt, isNull } from 'drizzle-orm'
import { db } from '~/server/db'
import { payments } from '~/server/db/schema'
import { verifyJWT } from '~/lib/auth/jwt'

// Utility function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const createTransferWithRetry = async (
  payment: any,
  mentorStripeAccountId: string,
  maxRetries = 3
): Promise<Stripe.Transfer | null> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const transfer = await stripe.transfers.create({
        amount: payment.mentorAmount,
        currency: payment.currency,
        destination: mentorStripeAccountId,
        metadata: {
          paymentId: payment.id.toString(),
          bookingId: payment.bookingId?.toString(),
          attempt: (attempt + 1).toString(),
        },
      })

      return transfer
    } catch (error) {
      console.error(`Transfer attempt ${attempt + 1} failed for payment ${payment.id}:`, error)

      // Update retry count
      await db
        .update(payments)
        .set({ transferRetryCount: attempt + 1 })
        .where(eq(payments.id, payment.id))

      if (attempt === maxRetries - 1) {
        // Final attempt failed - log and skip
        console.error(`All transfer attempts failed for payment ${payment.id}`)
        await sendAdminAlert({
          type: 'TRANSFER_FAILED',
          paymentId: payment.id,
          error: error.message,
          retryCount: maxRetries,
        })
        return null
      }

      // Exponential backoff: 2^attempt * 1000ms
      const backoffMs = Math.pow(2, attempt) * 1000
      await sleep(backoffMs)
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  try {
    // Secure JWT verification instead of simple Bearer token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const isValidToken = await verifyJWT(token, env.CRON_JWT_SECRET)

    if (!isValidToken) {
      return new Response('Unauthorized', { status: 401 })
    }

    const now = new Date()

    // Find payments ready for transfer (excluding disputed ones and max retry reached)
    const paymentsToTransfer = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, 'SUCCEEDED'),
          isNull(payments.transferId),
          eq(payments.disputeRequested, false),
          lt(payments.disputePeriodEnds, now),
          lt(payments.transferRetryCount, 3) // Skip after 3 failed attempts
        )
      )

    let processedCount = 0
    let failedCount = 0

    for (const payment of paymentsToTransfer) {
      try {
        // Get mentor's connected account
        const mentorAccount = await getMentorStripeAccountByUserId(payment.mentorUserId)

        if (!mentorAccount?.stripeAccountId) {
          console.warn(`No Stripe account found for mentor ${payment.mentorUserId}`)
          continue
        }

        // Create transfer with retry logic
        const transfer = await createTransferWithRetry(payment, mentorAccount.stripeAccountId)

        if (transfer) {
          // Update payment record with successful transfer
          await db
            .update(payments)
            .set({
              transferId: transfer.id,
              transferStatus: 'TRANSFERRED',
              status: 'TRANSFERRED',
            })
            .where(eq(payments.id, payment.id))

          // Send payout notification to mentor
          await sendPayoutNotificationEmail({
            mentorEmail: mentorAccount.user.email,
            amount: payment.mentorAmount,
            currency: payment.currency,
            transferId: transfer.id,
          })

          processedCount++
        } else {
          failedCount++
        }
      } catch (error) {
        console.error(`Failed to process payment ${payment.id}:`, error)
        failedCount++
      }
    }

    console.log(`Transfer cron completed: ${processedCount} processed, ${failedCount} failed`)

    return NextResponse.json({
      processed: processedCount,
      failed: failedCount,
      total: paymentsToTransfer.length,
    })
  } catch (error) {
    console.error('Transfer cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 6. Manual Payout Configuration

#### A. Update Connected Account Settings

```typescript
/**
 * Configure manual payouts for a connected account.
 * IMPORTANT: This must be called after the connected account is created
 * and before any payments are processed for that mentor.
 */
export const configureManualPayouts = async (stripeAccountId: string) => {
  await stripe.accounts.update(stripeAccountId, {
    settings: {
      payouts: {
        schedule: {
          interval: 'manual',
        },
      },
    },
  })

  console.log(`Manual payouts configured for account: ${stripeAccountId}`)
}

/**
 * Call this when a mentor completes their Stripe Express onboarding
 */
export const setupMentorStripeAccount = async (mentorUserId: string, stripeAccountId: string) => {
  // 1. Save account to database
  await saveMentorStripeAccount(mentorUserId, stripeAccountId)

  // 2. Configure manual payouts
  await configureManualPayouts(stripeAccountId)

  // 3. Update account status
  await updateMentorAccountStatus(mentorUserId, 'CONFIGURED')
}
```

### 7. Email Notification System

#### A. Email Templates and Sending Logic

**File**: `src/lib/emails/booking-notifications.ts`

```typescript
import { Resend } from 'resend'

const resend = new Resend(env.RESEND_API_KEY)

export const sendBookingConfirmationEmail = async ({
  attendeeEmail,
  mentorEmail,
  booking,
}: {
  attendeeEmail: string
  mentorEmail: string
  booking: any
}) => {
  // Send to attendee
  await resend.emails.send({
    from: 'Discuno <bookings@discuno.com>',
    to: attendeeEmail,
    subject: 'Booking Confirmed - Your Session is Scheduled',
    html: BookingConfirmedTemplate({ booking, recipient: 'attendee' }),
  })

  // Send to mentor
  await resend.emails.send({
    from: 'Discuno <bookings@discuno.com>',
    to: mentorEmail,
    subject: 'New Booking - You have a scheduled session',
    html: BookingConfirmedTemplate({ booking, recipient: 'mentor' }),
  })
}

export const sendPayoutNotificationEmail = async ({
  mentorEmail,
  amount,
  currency,
  transferId,
}: {
  mentorEmail: string
  amount: number
  currency: string
  transferId: string
}) => {
  await resend.emails.send({
    from: 'Discuno <payouts@discuno.com>',
    to: mentorEmail,
    subject: 'Payout Processed - Funds Transferred',
    html: PayoutProcessedTemplate({ amount, currency, transferId }),
  })
}

export const sendDisputeNotificationEmail = async ({
  mentorEmail,
  attendeeEmail,
  booking,
  reason,
}: {
  mentorEmail: string
  attendeeEmail: string
  booking: any
  reason: string
}) => {
  // Notify mentor
  await resend.emails.send({
    from: 'Discuno <disputes@discuno.com>',
    to: mentorEmail,
    subject: 'Dispute Filed - Action Required',
    html: DisputeFiledTemplate({ booking, reason, recipient: 'mentor' }),
  })

  // Notify attendee
  await resend.emails.send({
    from: 'Discuno <disputes@discuno.com>',
    to: attendeeEmail,
    subject: 'Your Dispute Has Been Filed',
    html: DisputeFiledTemplate({ booking, reason, recipient: 'attendee' }),
  })
}

export const sendRefundNotificationEmail = async ({
  customerEmail,
  amount,
  reason,
}: {
  customerEmail: string
  amount: number
  reason: string
}) => {
  await resend.emails.send({
    from: 'Discuno <refunds@discuno.com>',
    to: customerEmail,
    subject: 'Refund Processed',
    html: RefundProcessedTemplate({ amount, reason }),
  })
}

export const sendAdminAlert = async ({
  type,
  paymentId,
  error,
  retryCount,
}: {
  type: string
  paymentId: number
  error: string
  retryCount?: number
}) => {
  await resend.emails.send({
    from: 'Discuno Alerts <alerts@discuno.com>',
    to: env.ADMIN_EMAIL,
    subject: `ALERT: ${type} - Payment ${paymentId}`,
    html: AdminAlertTemplate({ type, paymentId, error, retryCount }),
  })
}
```

### 8. Security Considerations

1. **PCI Compliance**: Stripe handles all card data, keeping us PCI compliant
2. **CSRF Protection**: Use Next.js built-in CSRF protection for server actions
3. **Rate Limiting**: Implement rate limiting on checkout session creation
4. **Webhook Verification**: Always verify webhook signatures
5. **Metadata Validation**: Validate all metadata from Stripe events

### 8. Security Considerations

1. **PCI Compliance**: Stripe handles all card data, keeping us PCI compliant
2. **CSRF Protection**: Use Next.js built-in CSRF protection for server actions
3. **Rate Limiting**: Implement rate limiting on checkout session creation
4. **Webhook Verification**: Always verify webhook signatures
5. **Metadata Validation**: Validate all metadata from Stripe events
6. **Input Validation**: Use Zod schemas for all server action inputs
7. **JWT Security**: Use signed JWTs for cron job authentication with expiration
8. **Database Security**: Use parameterized queries and proper indexing

### 9. Testing Strategy

1. **Unit Tests**: Test server actions and utility functions
2. **Integration Tests**: Test complete booking + payment flow
3. **Stripe Test Mode**: Use Stripe test cards for development
4. **Webhook Testing**: Use Stripe CLI for local webhook testing

### 9. Testing Strategy

1. **Unit Tests**: Test server actions and utility functions
2. **Integration Tests**: Test complete booking + payment flow
3. **Stripe Test Mode**: Use Stripe test cards for development
4. **Webhook Testing**: Use Stripe CLI for local webhook testing
5. **Transfer Testing**: Test retry logic with mock Stripe failures
6. **Email Testing**: Use test email providers during development
7. **Cron Job Testing**: Test with mock JWT tokens and payment scenarios

### 10. Error Handling

1. **Payment Failures**: Graceful handling with user-friendly messages
2. **Booking Creation Failures**: Refund payment if booking fails
3. **Transfer Failures**: Retry mechanism with manual fallback
4. **Dispute Handling**: Admin interface for manual intervention

### 10. Error Handling

1. **Payment Failures**: Graceful handling with user-friendly messages
2. **Booking Creation Failures**: Automatic refund via `stripe.refunds.create()` with status update to `REFUNDED`
3. **Transfer Failures**: Exponential backoff retry mechanism (max 3 attempts) with admin alerts
4. **Dispute Handling**: Admin interface for manual intervention with `disputeRequested` flag
5. **Webhook Failures**: Proper error responses and retry handling
6. **Email Failures**: Fallback notifications and admin alerts
7. **Cron Job Failures**: Comprehensive logging and admin notifications

### 11. Monitoring & Analytics

1. **Payment Tracking**: Dashboard for payment status monitoring
2. **Transfer Monitoring**: Track successful/failed transfers
3. **Revenue Analytics**: Platform fee tracking
4. **Error Alerting**: Real-time alerts for payment issues

### 11. Monitoring & Analytics

1. **Payment Tracking**: Dashboard for payment status monitoring
2. **Transfer Monitoring**: Track successful/failed transfers with retry counts
3. **Revenue Analytics**: Platform fee tracking and revenue reporting
4. **Error Alerting**: Real-time alerts for payment issues and transfer failures
5. **Dispute Metrics**: Track dispute rates and resolution times
6. **Email Delivery**: Monitor email delivery success rates
7. **Performance Monitoring**: Track checkout completion rates and abandonment

### 12. Payment Flow Chart

```
Customer Payment → Platform Stripe Account
                ↓
        [72-hour Hold Period]
                ↓
        Check dispute flag
                ↓
    ┌─ disputeRequested=true → Manual Review
    └─ disputeRequested=false → Auto Transfer
                ↓
        Transfer to Mentor
                ↓
        Email Notifications
```

**Refund Edge Cases:**

- Booking creation fails → Immediate refund
- Dispute filed within 72hrs → Hold transfer, manual review
- Transfer fails 3x → Admin alert, manual intervention
- Mentor account suspended → Hold transfer, admin review

## Implementation Priority

1. **Phase 1**: Database schema with new fields, Zod validation, basic checkout flow
2. **Phase 2**: Enhanced webhook handling, payment tracking, email notifications
3. **Phase 3**: Auto-transfer system with retry logic, manual payout configuration, secure cron jobs
4. **Phase 4**: Error handling, monitoring, admin tools, dispute management interface

## Key Security & Reliability Improvements

- ✅ **Enhanced Input Validation**: Zod schemas for all server actions
- ✅ **Improved Payment Verification**: Check `paymentIntent.status` instead of `session.payment_status`
- ✅ **Robust Transfer System**: Exponential backoff retry with max 3 attempts
- ✅ **Dispute Prevention**: `disputeRequested` flag for manual intervention
- ✅ **Comprehensive Notifications**: Email alerts for all payment events
- ✅ **Automatic Refunds**: Handle booking failures with immediate refunds
- ✅ **Secure Cron Jobs**: JWT-based authentication instead of simple Bearer tokens
- ✅ **Module-level Optimization**: Memoized `stripePromise` for better performance
- ✅ **Manual Payout Setup**: Clear documentation on when to configure manual payouts

This implementation provides a secure, scalable payment system that integrates seamlessly with your existing booking flow while maintaining the 72-hour dispute resolution period through manual payouts. The enhanced error handling, retry logic, and notification system ensure reliability and transparency for all stakeholders.
