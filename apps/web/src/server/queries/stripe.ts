'server only'

import { cache } from 'react'
import type { MentorStripeAccount } from '~/lib/schemas/db'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getStripeAccountByUserId } from '~/server/dal/stripe'

/**
 * Query Layer for Stripe accounts
 * Includes caching and auth checks
 */

/**
 * Get mentor's Stripe account information
 */
export const getMentorStripeAccount = cache(async (): Promise<MentorStripeAccount | null> => {
  const { id: currentUserId } = await requireAuth()

  return getStripeAccountByUserId(currentUserId)
})
