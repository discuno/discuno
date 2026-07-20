import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createReversal: vi.fn(),
  findPayment: vi.fn(),
  insert: vi.fn(),
  insertedValues: [] as Array<Record<string, unknown>>,
  listRefunds: vi.fn(),
  refundStripePaymentIntent: vi.fn(),
  retrieveCharge: vi.fn(),
  retrieveTransfer: vi.fn(),
  select: vi.fn(),
  sendAdminAlert: vi.fn(),
  transaction: vi.fn(),
  transactionExecute: vi.fn(),
  update: vi.fn(),
  withDatabaseAdvisoryLock: vi.fn(),
  updateSets: [] as Array<Record<string, unknown>>,
  updateWhereClauses: [] as Array<{
    condition: SQL
    values: Record<string, unknown>
  }>,
}))

vi.mock('~/inngest/client', () => ({
  inngest: { send: vi.fn() },
}))

vi.mock('~/lib/calcom', () => ({
  cancelCalcomBooking: vi.fn(),
  getCalcomBooking: vi.fn(),
}))

vi.mock('~/lib/emails/booking-notifications', () => ({
  sendAdminAlert: mocks.sendAdminAlert,
  sendPayoutNotificationEmail: vi.fn(),
  sendRefundNotificationEmail: vi.fn(),
}))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    charges: { retrieve: mocks.retrieveCharge },
    refunds: { list: mocks.listRefunds },
    transfers: {
      createReversal: mocks.createReversal,
      retrieve: mocks.retrieveTransfer,
    },
  },
}))

vi.mock('~/lib/stripe/refund', () => ({
  refundStripePaymentIntent: mocks.refundStripePaymentIntent,
}))

vi.mock('~/server/db', () => ({
  db: {
    insert: mocks.insert,
    query: { payment: { findFirst: mocks.findPayment } },
    select: mocks.select,
    transaction: mocks.transaction,
    update: mocks.update,
  },
}))

vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: mocks.withDatabaseAdvisoryLock,
}))

import { holdBookingPaymentForManualReview, syncStripeRefund } from '~/lib/services/payment-service'

describe('payment-service refund reconciliation', () => {
  const paymentState: Record<string, unknown> = {
    platformStatus: 'TRANSFERRED',
    requiresManualReview: false,
    reviewReason: null,
    transferReversalId: null,
    transferStatus: 'created',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insertedValues.length = 0
    mocks.updateSets.length = 0
    mocks.updateWhereClauses.length = 0
    Object.assign(paymentState, {
      platformStatus: 'TRANSFERRED',
      requiresManualReview: false,
      reviewReason: null,
      transferReversalId: null,
      transferStatus: 'created',
    })

    mocks.transaction.mockImplementation(
      async (operation: (tx: { execute: typeof mocks.transactionExecute }) => Promise<unknown>) =>
        operation({ execute: mocks.transactionExecute })
    )
    mocks.withDatabaseAdvisoryLock.mockImplementation(
      async (_key: string, operation: () => Promise<unknown>) => operation()
    )
    mocks.insert.mockImplementation(() => ({
      values: (values: Record<string, unknown>) => {
        mocks.insertedValues.push(values)
        return { onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) }
      },
    }))
    mocks.select.mockImplementation(() => ({
      from: () => ({ where: vi.fn().mockResolvedValue([]) }),
    }))
    mocks.update.mockImplementation(() => ({
      set: (values: Record<string, unknown>) => {
        mocks.updateSets.push(values)
        return {
          where: vi.fn().mockImplementation(async (condition: SQL) => {
            mocks.updateWhereClauses.push({ condition, values })
            // The service's recovery cleanup is deliberately scoped to an earlier
            // "Transfer reversal failed" review. Model that predicate so this test
            // catches an accidental unconditional clear of the refund review hold.
            const clearsRecoveredReversalReview =
              values.requiresManualReview === false && values.reviewReason === null
            const conditionParams = new PgDialect().sqlToQuery(condition).params
            const scopesRecoveryToTransferReversalFailure = conditionParams.includes(
              'Transfer reversal failed:%'
            )
            if (
              clearsRecoveredReversalReview &&
              scopesRecoveryToTransferReversalFailure &&
              typeof paymentState.reviewReason === 'string' &&
              !paymentState.reviewReason.startsWith('Transfer reversal failed:')
            ) {
              return []
            }

            for (const [key, value] of Object.entries(values)) {
              if (key in paymentState) paymentState[key] = value
            }
            return []
          }),
        }
      },
    }))
  })

  it('reverses an existing mentor transfer and keeps a requires-action refund on hold', async () => {
    const refund = {
      id: 're_requires_action',
      amount: 5_000,
      charge: 'ch_refunded_payment',
      currency: 'usd',
      metadata: { discunoPurpose: 'mentor_cancelled' },
      payment_intent: 'pi_refunded_payment',
      status: 'requires_action',
    } as unknown as Stripe.Refund

    mocks.findPayment.mockResolvedValueOnce({ id: 42 }).mockResolvedValueOnce({
      id: 42,
      amount: 5_000,
      customerEmail: 'mentee@example.edu',
      refundedAt: null,
      requiresManualReview: false,
      reviewReason: null,
      stripePaymentIntentId: 'pi_refunded_payment',
      transferId: 'tr_mentor_1',
      transferReversalId: null,
    })
    mocks.listRefunds.mockResolvedValue({ data: [refund], has_more: false })
    mocks.retrieveCharge.mockResolvedValue({ amount_refunded: 0 })
    mocks.retrieveTransfer.mockResolvedValue({
      amount: 4_250,
      amount_reversed: 250,
      id: 'tr_mentor_1',
      reversed: false,
      reversals: { data: [] },
    })
    mocks.createReversal.mockResolvedValue({ amount: 4_000, id: 'trr_refund_hold' })

    await expect(syncStripeRefund(refund)).resolves.toBe(true)

    expect(mocks.createReversal).toHaveBeenCalledWith(
      'tr_mentor_1',
      {
        amount: 4_000,
        metadata: {
          discunoPaymentId: '42',
          discunoPurpose: 'refund_re_requires_action',
        },
      },
      { idempotencyKey: 'discuno:transfer-reversal:v2:tr_mentor_1' }
    )
    expect(mocks.insertedValues).toContainEqual(
      expect.objectContaining({
        paymentId: 42,
        status: 'requires_action',
        stripeRefundId: 're_requires_action',
      })
    )
    expect(mocks.updateSets).toContainEqual(
      expect.objectContaining({
        platformStatus: 'PROCESSING',
        refundStatus: 'requires_action',
        requiresManualReview: true,
        reviewReason: 'Stripe refund re_requires_action is requires_action',
      })
    )
    const recoveryCleanup = mocks.updateWhereClauses.find(
      update => update.values.requiresManualReview === false && update.values.reviewReason === null
    )
    expect(recoveryCleanup).toBeDefined()
    expect(new PgDialect().sqlToQuery(recoveryCleanup!.condition).params).toEqual([
      42,
      'Transfer reversal failed:%',
    ])
    expect(paymentState).toMatchObject({
      platformStatus: 'PROCESSING',
      requiresManualReview: true,
      reviewReason: 'Stripe refund re_requires_action is requires_action',
      transferReversalId: 'trr_refund_hold',
      transferStatus: 'reversed',
    })
    expect(mocks.refundStripePaymentIntent).not.toHaveBeenCalled()
  })

  it('persists and alerts once for an unclassified paid cancellation', async () => {
    mocks.select.mockImplementationOnce(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([
              {
                paymentId: 42,
              },
            ]),
          }),
        }),
      }),
    }))
    mocks.findPayment.mockResolvedValue({
      id: 42,
      platformStatus: 'SUCCEEDED',
      transferId: null,
      transferReversalId: null,
      transferStatus: null,
    })
    mocks.update.mockImplementationOnce(() => ({
      set: (values: Record<string, unknown>) => {
        mocks.updateSets.push(values)
        return {
          where: () => ({
            returning: vi.fn().mockResolvedValue([{ id: 42 }]),
          }),
        }
      },
    }))

    await expect(
      holdBookingPaymentForManualReview(
        'booking-needs-review',
        'late cancellation could not be attributed'
      )
    ).resolves.toMatchObject({ success: true, reason: 'manual_review' })

    expect(mocks.updateSets).toContainEqual(
      expect.objectContaining({
        requiresManualReview: true,
        reviewReason: 'Cancellation actor unresolved: late cancellation could not be attributed',
      })
    )
    expect(mocks.sendAdminAlert).toHaveBeenCalledWith({
      type: 'CANCELLATION_ACTOR_REQUIRES_REVIEW',
      paymentId: 42,
      error: 'Cancellation actor unresolved: late cancellation could not be attributed',
    })
  })

  it('reverses an existing transfer under the payment lock before holding cancellation funds', async () => {
    mocks.select.mockImplementationOnce(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ paymentId: 42 }]),
          }),
        }),
      }),
    }))
    mocks.findPayment.mockResolvedValue({
      id: 42,
      platformStatus: 'TRANSFERRED',
      transferId: 'tr_cancellation_hold',
      transferReversalId: null,
      transferStatus: 'created',
    })
    mocks.retrieveTransfer.mockResolvedValue({
      amount: 4_250,
      amount_reversed: 0,
      id: 'tr_cancellation_hold',
      reversed: false,
      reversals: { data: [] },
    })
    mocks.createReversal.mockResolvedValue({ amount: 4_250, id: 'trr_cancellation_hold' })
    mocks.update.mockImplementation(() => ({
      set: (values: Record<string, unknown>) => {
        mocks.updateSets.push(values)
        return {
          where: (condition: SQL) => {
            mocks.updateWhereClauses.push({ condition, values })
            if (
              values.requiresManualReview === true &&
              typeof values.reviewReason === 'string' &&
              values.reviewReason.startsWith('Cancellation actor unresolved:')
            ) {
              return { returning: vi.fn().mockResolvedValue([{ id: 42 }]) }
            }
            return Promise.resolve([])
          },
        }
      },
    }))

    await expect(
      holdBookingPaymentForManualReview(
        'booking-needs-review',
        'late cancellation could not be attributed'
      )
    ).resolves.toMatchObject({ success: true, reason: 'manual_review' })

    expect(mocks.withDatabaseAdvisoryLock).toHaveBeenCalledWith(
      'discuno:payment-operation:42',
      expect.any(Function)
    )
    expect(mocks.createReversal).toHaveBeenCalledWith(
      'tr_cancellation_hold',
      {
        amount: 4_250,
        metadata: {
          discunoPaymentId: '42',
          discunoPurpose: 'unclassified_cancellation_hold',
        },
      },
      { idempotencyKey: 'discuno:transfer-reversal:v2:tr_cancellation_hold' }
    )
    expect(mocks.updateSets).toContainEqual(
      expect.objectContaining({
        transferReversalId: 'trr_cancellation_hold',
        transferStatus: 'reversed',
      })
    )
    expect(mocks.updateSets).toContainEqual(
      expect.objectContaining({ platformStatus: 'SUCCEEDED' })
    )
    expect(mocks.updateSets).toContainEqual(expect.objectContaining({ requiresManualReview: true }))
  })
})
