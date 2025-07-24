import { and, eq, isNull, lt } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { env } from '~/env'
import { sendAdminAlert, sendPayoutNotificationEmail } from '~/lib/emails/booking-notifications'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import { mentorStripeAccounts, payments, users } from '~/server/db/schema'

// Utility function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Transfer with retry logic and exponential backoff
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
          bookingId: payment.bookingId?.toString() ?? '',
          attempt: (attempt + 1).toString(),
        },
      })

      console.log(`Transfer successful for payment ${payment.id}: ${transfer.id}`)
      return transfer
    } catch (error) {
      console.error(`Transfer attempt ${attempt + 1} failed for payment ${payment.id}:`, error)

      // Update retry count
      await db
        .update(payments)
        .set({ transferRetryCount: attempt + 1 })
        .where(eq(payments.id, payment.id))

      if (attempt === maxRetries - 1) {
        // Final attempt failed - log and alert admin
        console.error(`All transfer attempts failed for payment ${payment.id}`)

        // Send admin alert email
        await sendAdminAlert({
          type: 'TRANSFER_FAILED',
          paymentId: payment.id,
          error: error instanceof Error ? error.message : 'Unknown error',
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

/**
 * Auto-transfer cron job - processes payments after 72-hour dispute period
 */
export async function GET(req: NextRequest) {
  try {
    // Secure authentication using CRON_SECRET instead of custom JWT for now
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (token !== env.CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const now = new Date()
    console.log(`Transfer cron job started at ${now.toISOString()}`)

    // Find payments ready for transfer (excluding disputed ones and max retry reached)
    const paymentsToTransfer = await db
      .select({
        payment: payments,
        mentorAccount: mentorStripeAccounts,
        mentorUser: users,
      })
      .from(payments)
      .innerJoin(mentorStripeAccounts, eq(payments.mentorUserId, mentorStripeAccounts.userId))
      .innerJoin(users, eq(payments.mentorUserId, users.id))
      .where(
        and(
          eq(payments.platformStatus, 'SUCCEEDED'),
          isNull(payments.transferId),
          eq(payments.disputeRequested, false),
          lt(payments.disputePeriodEnds, now),
          lt(payments.transferRetryCount, 3) // Skip after 3 failed attempts
        )
      )

    let processedCount = 0
    let failedCount = 0

    console.log(`Found ${paymentsToTransfer.length} payments ready for transfer`)

    for (const { payment, mentorAccount, mentorUser } of paymentsToTransfer) {
      try {
        if (!mentorAccount.stripeAccountId) {
          console.warn(`No Stripe account found for mentor ${payment.mentorUserId}`)
          continue
        }

        // Verify mentor account is still active
        if (mentorAccount.stripeAccountStatus !== 'active') {
          console.warn(
            `Mentor account ${mentorAccount.stripeAccountId} is not active, skipping transfer`
          )
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
              platformStatus: 'TRANSFERRED',
            })
            .where(eq(payments.id, payment.id))

          // Send payout notification email to mentor
          if (mentorUser.email) {
            await sendPayoutNotificationEmail({
              mentorEmail: mentorUser.email,
              amount: payment.mentorAmount,
              currency: payment.currency,
              transferId: transfer.id,
            })
          }

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
      success: true,
      processed: processedCount,
      failed: failedCount,
      total: paymentsToTransfer.length,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Transfer cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
