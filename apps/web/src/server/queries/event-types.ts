import 'server-only'

import { cache } from 'react'
import { requireAuth } from '~/lib/auth/auth-utils'
import type { MentorEventType } from '~/lib/schemas/db'
import {
  getEnabledEventTypesWithStripeStatus,
  getEventTypesByUserId,
} from '~/server/dal/event-types'

/**
 * Query Layer for mentor event types
 * Includes caching and auth checks
 */

/**
 * Get mentor's event type preferences with details
 */
export const getMentorEventTypes = cache(async (): Promise<MentorEventType[]> => {
  const { id: currentUserId } = await requireAuth()

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

    // Filter out paid event types without Stripe charges enabled
    return result
      .filter(item => {
        if (item.customPrice && item.customPrice > 0) {
          return item.chargesEnabled === true
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
