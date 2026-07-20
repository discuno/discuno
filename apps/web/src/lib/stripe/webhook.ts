import 'server-only'

import type { Stripe } from 'stripe'
import { handleCheckoutSessionWebhook } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  syncStripeDispute,
  syncStripePaymentFailure,
  syncStripeRefund,
} from '~/lib/services/payment-service'
import { releaseCheckoutSlotReservationFromMetadata } from '~/lib/services/checkout-slot-reservation'
import { deriveStripeAccountStatus } from '~/lib/stripe/account-status'
import { stripe } from '~/lib/stripe/index'
import {
  getStripeAccountByStripeId,
  getStripeAccountByUserId,
  markStripeAccountDeleted,
  upsertStripeAccount,
} from '~/server/dal/stripe'

const getExpandableId = (value: string | { id: string } | null): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null)

const handleCheckoutSessionSucceeded = async (checkoutSession: Stripe.Checkout.Session) => {
  if (checkoutSession.payment_status !== 'paid') return

  const response = await handleCheckoutSessionWebhook(checkoutSession)
  if (response.status !== 200) {
    throw new Error(`Checkout fulfillment boundary returned ${response.status}`)
  }
}

/** Reconcile the latest Stripe object state; deliveries may be duplicated or unordered. */
export const processStripeWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await handleCheckoutSessionSucceeded(event.data.object)
      break

    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed': {
      const refund = await stripe.refunds.retrieve(event.data.object.id)
      const matched = await syncStripeRefund(refund)
      if (!matched) console.warn('Stripe refund has no Discuno payment', { refundId: refund.id })
      break
    }

    case 'charge.dispute.created':
    case 'charge.dispute.updated':
    case 'charge.dispute.closed': {
      const dispute = await stripe.disputes.retrieve(event.data.object.id)
      const matched = await syncStripeDispute(dispute)
      if (!matched) {
        console.warn('Stripe dispute has no Discuno payment', { disputeId: dispute.id })
      }
      break
    }

    case 'checkout.session.async_payment_failed': {
      const paymentIntentId = getExpandableId(event.data.object.payment_intent)
      if (paymentIntentId) await syncStripePaymentFailure(paymentIntentId, event.type)
      await releaseCheckoutSlotReservationFromMetadata(event.data.object.metadata)
      break
    }

    case 'checkout.session.expired': {
      await releaseCheckoutSlotReservationFromMetadata(event.data.object.metadata)
      break
    }

    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
      await syncStripePaymentFailure(event.data.object.id, event.type)
      break

    case 'charge.failed': {
      const paymentIntentId = getExpandableId(event.data.object.payment_intent)
      if (paymentIntentId) await syncStripePaymentFailure(paymentIntentId, event.type)
      break
    }
  }
}

export const processStripeConnectWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  if (event.type !== 'account.updated') return

  // Deliveries can be delayed and reordered. Retrieve Stripe's current object
  // instead of allowing an older event snapshot to regress payout readiness.
  const accountId = event.data.object.id
  const eventDeleted = (event.data.object as unknown as { deleted?: boolean }).deleted === true
  if (eventDeleted) {
    const disabled = await markStripeAccountDeleted(accountId)
    if (!disabled) console.warn('Deleted Stripe account has no Discuno record')
    return
  }

  let retrievedAccount
  try {
    retrievedAccount = await stripe.accounts.retrieve(accountId)
  } catch (error) {
    const candidate = error as { code?: unknown; raw?: { code?: unknown } }
    const code = candidate.code ?? candidate.raw?.code
    if (code !== 'resource_missing') throw error

    const disabled = await markStripeAccountDeleted(accountId)
    if (!disabled) console.warn('Deleted Stripe account has no Discuno record')
    return
  }
  const accountCandidate = retrievedAccount as Stripe.Account | Stripe.DeletedAccount
  if ('deleted' in accountCandidate && accountCandidate.deleted) {
    const disabled = await markStripeAccountDeleted(accountCandidate.id)
    if (!disabled) console.warn('Deleted Stripe account has no Discuno record')
    return
  }
  const account = accountCandidate
  const userId = account.metadata?.userId
  if (!userId) {
    console.warn('Stripe account update has no Discuno user ID', { accountId: account.id })
    return
  }

  const [storedForUser, storedByStripeId] = await Promise.all([
    getStripeAccountByUserId(userId),
    getStripeAccountByStripeId(account.id),
  ])
  if (
    (storedForUser && storedForUser.stripeAccountId !== account.id) ||
    (storedByStripeId && storedByStripeId.userId !== userId)
  ) {
    throw new Error('Stripe connected account ownership does not match Discuno records')
  }

  await upsertStripeAccount({
    userId,
    stripeAccountId: account.id,
    stripeAccountStatus: deriveStripeAccountStatus(account),
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    transfersEnabled: account.capabilities?.transfers === 'active',
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  })
}
