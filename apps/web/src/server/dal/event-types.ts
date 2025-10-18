import 'server-only'

import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { UpdateMentorEventType } from '~/lib/schemas/db'
import { updateMentorEventTypeSchema } from '~/lib/schemas/db'
import { NotFoundError } from '~/lib/errors'
import { db } from '~/server/db'
import { mentorEventTypes, mentorStripeAccounts } from '~/server/db/schema'

/**
 * Data Access Layer for mentor event types
 * Raw database operations with no caching or auth checks
 */

/**
 * Get all event types for a mentor
 */
export const getEventTypesByUserId = async (userId: string) => {
  return db.query.mentorEventTypes.findMany({
    where: eq(mentorEventTypes.mentorUserId, userId),
  })
}

/**
 * Get single event type by Cal.com event type ID
 */
export const getEventTypeByCalcomId = async (calcomEventTypeId: number) => {
  return db.query.mentorEventTypes.findFirst({
    where: eq(mentorEventTypes.calcomEventTypeId, calcomEventTypeId),
  })
}

/**
 * Get enabled event types for a user with Stripe status check
 */
export const getEnabledEventTypesWithStripeStatus = async (userId: string) => {
  return db
    .select({
      calcomEventTypeId: mentorEventTypes.calcomEventTypeId,
      title: mentorEventTypes.title,
      description: mentorEventTypes.description,
      duration: mentorEventTypes.duration,
      customPrice: mentorEventTypes.customPrice,
      currency: mentorEventTypes.currency,
      chargesEnabled: mentorStripeAccounts.chargesEnabled,
    })
    .from(mentorEventTypes)
    .leftJoin(mentorStripeAccounts, eq(mentorEventTypes.mentorUserId, mentorStripeAccounts.userId))
    .where(
      and(
        eq(mentorEventTypes.mentorUserId, userId),
        eq(mentorEventTypes.isEnabled, true),
        isNotNull(mentorEventTypes.calcomEventTypeId)
      )
    )
}

/**
 * Update event type by Cal.com event type ID
 */
export const updateEventType = async (
  calcomEventTypeId: number,
  data: UpdateMentorEventType
): Promise<void> => {
  const validData = updateMentorEventTypeSchema.parse(data)

  const res = await db
    .update(mentorEventTypes)
    .set(validData)
    .where(eq(mentorEventTypes.calcomEventTypeId, calcomEventTypeId))
    .returning({ id: mentorEventTypes.id })

  if (res.length === 0) {
    throw new NotFoundError(`Mentor event type with Cal.com ID ${calcomEventTypeId} not found`)
  }
}

/**
 * Upsert event types (bulk operation for sync)
 */
export const upsertEventTypes = async (
  values: Array<{
    mentorUserId: string
    calcomEventTypeId: number
    title: string
    description: string | null
    duration: number
    isEnabled: boolean
    currency: string
    createdAt: Date
    updatedAt: Date
  }>
): Promise<void> => {
  if (values.length === 0) return

  const now = new Date()

  await db
    .insert(mentorEventTypes)
    .values(values)
    .onConflictDoUpdate({
      target: mentorEventTypes.calcomEventTypeId,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        duration: sql`excluded.duration`,
        updatedAt: now,
      },
    })
}

/**
 * Delete event types by Cal.com IDs
 */
export const deleteEventTypesByCalcomIds = async (
  userId: string,
  calcomEventTypeIds: number[]
): Promise<void> => {
  if (calcomEventTypeIds.length === 0) return

  await db
    .delete(mentorEventTypes)
    .where(
      and(
        eq(mentorEventTypes.mentorUserId, userId),
        inArray(mentorEventTypes.calcomEventTypeId, calcomEventTypeIds)
      )
    )
}

/**
 * Get existing event types for sync comparison
 */
export const getExistingEventTypesForSync = async (userId: string) => {
  return db
    .select({
      calcomEventTypeId: mentorEventTypes.calcomEventTypeId,
      title: mentorEventTypes.title,
      description: mentorEventTypes.description,
      duration: mentorEventTypes.duration,
    })
    .from(mentorEventTypes)
    .where(eq(mentorEventTypes.mentorUserId, userId))
}
