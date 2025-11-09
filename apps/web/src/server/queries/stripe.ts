import 'server-only'

import { cache } from 'react'
import { requirePermission } from '~/lib/auth/auth-utils'
import type { MentorStripeAccount } from '~/lib/schemas/db'
import { getStripeAccountByUserId } from '~/server/dal/stripe'

/**
 * Query Layer for Stripe accounts
 *
 * SECURITY: Permission checks enforced here (data access layer)
 * Layouts/actions/services delegate to these functions for protection
 */

/**
 * Get mentor's Stripe account information
 * Protected by mentor permission (data access layer)
 */
export const getMentorStripeAccount = cache(async (): Promise<MentorStripeAccount | null> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const currentUserId = user.id

  return getStripeAccountByUserId(currentUserId)
})
