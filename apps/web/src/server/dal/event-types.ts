import 'server-only'

import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { NotFoundError } from '~/lib/errors'
import type { UpdateMentorEventType } from '~/lib/schemas/db'
import { updateMentorEventTypeSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { mentorEventType, mentorStripeAccount } from '~/server/db/schema/index'

/**
 * Data Access Layer for mentor event types
 * Raw database operations with no caching or auth checks
 */

/**
 * Get all event types for a mentor
 */
export const getEventTypesByUserId = async (userId: string) => {
  return db.query.mentorEventType.findMany({
    where: eq(mentorEventType.mentorUserId, userId),
  })
}

/**
 * Get single event type by Cal.com event type ID
 */
export const getEventTypeByCalcomId = async (calcomEventTypeId: number) => {
  return db.query.mentorEventType.findFirst({
    where: eq(mentorEventType.calcomEventTypeId, calcomEventTypeId),
  })
}

/**
 * Get enabled event types for a user with Stripe status check
 */
export const getEnabledEventTypesWithStripeStatus = async (userId: string) => {
  return db
    .select({
      calcomEventTypeId: mentorEventType.calcomEventTypeId,
      title: mentorEventType.title,
      description: mentorEventType.description,
      duration: mentorEventType.duration,
      customPrice: mentorEventType.customPrice,
      currency: mentorEventType.currency,
      chargesEnabled: mentorStripeAccount.chargesEnabled,
    })
    .from(mentorEventType)
    .leftJoin(mentorStripeAccount, eq(mentorEventType.mentorUserId, mentorStripeAccount.userId))
    .where(
      and(
        eq(mentorEventType.mentorUserId, userId),
        eq(mentorEventType.isEnabled, true),
        isNotNull(mentorEventType.calcomEventTypeId)
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
    .update(mentorEventType)
    .set(validData)
    .where(eq(mentorEventType.calcomEventTypeId, calcomEventTypeId))
    .returning({ id: mentorEventType.id })

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
    .insert(mentorEventType)
    .values(values)
    .onConflictDoUpdate({
      target: mentorEventType.calcomEventTypeId,
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
    .delete(mentorEventType)
    .where(
      and(
        eq(mentorEventType.mentorUserId, userId),
        inArray(mentorEventType.calcomEventTypeId, calcomEventTypeIds)
      )
    )
}

/**
 * Get existing event types for sync comparison
 */
export const getExistingEventTypesForSync = async (userId: string) => {
  return db
    .select({
      calcomEventTypeId: mentorEventType.calcomEventTypeId,
      title: mentorEventType.title,
      description: mentorEventType.description,
      duration: mentorEventType.duration,
    })
    .from(mentorEventType)
    .where(eq(mentorEventType.mentorUserId, userId))
}
