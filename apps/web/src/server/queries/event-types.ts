import 'server-only'

import { cache } from 'react'
import { env } from '~/env'
import { requirePermission } from '~/lib/auth/auth-utils'
import { BadRequestError, NotFoundError } from '~/lib/errors'
import type { MentorEventType, UpdateMentorEventType } from '~/lib/schemas/db'
import {
  getEnabledEventTypesWithStripeStatus,
  getEventTypesByUserId,
  updateEventType,
} from '~/server/dal/event-types'
import { getStripeAccountByUserId } from '~/server/dal/stripe'

/**
 * Query Layer for mentor event types
 *
 * SECURITY: Permission checks enforced here (data access layer)
 * Layouts/actions/services delegate to these functions for protection
 */

/**
 * Get mentor's event type preferences with details
 * Protected by mentor permission (data access layer)
 */
export const getMentorEventTypes = cache(async (): Promise<MentorEventType[]> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const currentUserId = user.id

  const result = await getEventTypesByUserId(currentUserId)

  return result.map(item => ({
    ...item,
    isEnabled: item.isEnabled,
  }))
})

/**
 * Get mentor's enabled event types for booking page
 */
export const getMentorEnabledEventTypes = cache(
  async (
    userId: string
  ): Promise<
    Array<{
      calcomEventTypeId: number
      title: string
      description: string | null
      duration: number
      customPrice: number | null
      currency: string
    }>
  > => {
    return getMentorEnabledEventTypesWithStripeStatus(userId)
  }
)

/**
 * Update mentor event type preference
 * Protected by mentor permission (data access layer)
 */
export const updateMentorEventType = async (
  eventTypeId: number,
  data: UpdateMentorEventType
): Promise<void> => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  const ownedEventTypes = await getEventTypesByUserId(user.id)
  const current = ownedEventTypes.find(item => item.calcomEventTypeId === eventTypeId)
  if (!current) throw new NotFoundError('Session type not found')

  const willBeEnabled = data.isEnabled ?? current.isEnabled
  const resultingPrice = data.customPrice ?? current.customPrice
  if (willBeEnabled && current.bookingCompatible !== true) {
    throw new BadRequestError(
      'Update unsupported booking options in Cal.com, then refresh session types before enabling this one.'
    )
  }

  if (willBeEnabled && resultingPrice > 0) {
    if (!env.PAYMENTS_ENABLED) {
      throw new BadRequestError(
        'Paid sessions are not available yet. Keep this session type paused or set it to free.'
      )
    }

    const stripeAccount = await getStripeAccountByUserId(user.id)
    const transfersEnabled =
      stripeAccount?.transfersEnabled ?? stripeAccount?.payoutsEnabled ?? false
    if (
      !stripeAccount ||
      stripeAccount.stripeAccountStatus !== 'active' ||
      !transfersEnabled ||
      !stripeAccount.payoutsEnabled
    ) {
      throw new BadRequestError('Complete payout setup before enabling a paid session type.')
    }
  }
  return updateEventType(eventTypeId, user.id, data)
}

/**
 * Get mentor's enabled event types with Stripe status check
 */
export const getMentorEnabledEventTypesWithStripeStatus = cache(
  async (
    userId: string
  ): Promise<
    Array<{
      calcomEventTypeId: number
      title: string
      description: string | null
      duration: number
      customPrice: number | null
      currency: string
    }>
  > => {
    const result = await getEnabledEventTypesWithStripeStatus(userId)

    // Filter out paid event types without an active transfer destination.
    return result
      .filter(item => {
        if (item.customPrice && item.customPrice > 0) {
          if (!env.PAYMENTS_ENABLED) return false

          return (
            (item.transfersEnabled === true ||
              (item.transfersEnabled === null && item.payoutsEnabled === true)) &&
            item.payoutsEnabled === true &&
            item.stripeAccountStatus === 'active'
          )
        }
        return true
      })
      .map(item => ({
        calcomEventTypeId: item.calcomEventTypeId,
        title: item.title,
        description: item.description,
        duration: item.duration,
        customPrice: item.customPrice,
        currency: item.currency,
      }))
  }
)
