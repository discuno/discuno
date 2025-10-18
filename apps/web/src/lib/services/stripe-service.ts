import { requireAuth } from '~/lib/auth/auth-utils'
import type { NewMentorStripeAccount } from '~/lib/schemas/db'
import { upsertStripeAccount } from '~/server/dal/stripe'

/**
 * Services Layer for Stripe integration
 * Handles Stripe account setup and management
 */

/**
 * Upsert mentor Stripe account
 */
export const upsertMentorStripeAccount = async (data: NewMentorStripeAccount): Promise<void> => {
  await requireAuth()
  return upsertStripeAccount(data)
}
