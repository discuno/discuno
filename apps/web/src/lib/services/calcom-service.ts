import { requireAuth } from '~/lib/auth/auth-utils'
import { fetchCalcomEventTypesByUsername } from '~/lib/calcom'
import type { UpdateMentorEventType } from '~/lib/schemas/db'
import {
  deleteEventTypesByCalcomIds,
  getExistingEventTypesForSync,
  updateEventType as updateEventTypeDal,
  upsertEventTypes,
} from '~/server/dal/event-types'
import { db } from '~/server/db'
import { getCalcomUsernameByUserId } from '~/server/queries/calcom'

/**
 * Services Layer for Cal.com integration
 * Handles event type syncing and external API calls
 */

/**
 * Compute which event types to create, update, and delete by comparing remote vs existing
 */
type RemoteEventType = {
  id: number
  title: string
  lengthInMinutes: number
  description?: string
}

type ExistingEventType = {
  calcomEventTypeId: number | null
  title: string
  description: string | null
  duration: number
}

function computeEventTypeSyncPlan(
  existingRows: ExistingEventType[],
  remoteRows: RemoteEventType[]
): {
  toCreateIds: number[]
  toUpdateIds: number[]
  toDeleteIds: number[]
} {
  const existingIds = new Set<number>(
    existingRows.map(r => r.calcomEventTypeId).filter((v): v is number => typeof v === 'number')
  )
  const remoteIds = new Set<number>(remoteRows.map(r => r.id))

  const toCreateIds: number[] = []
  const toUpdateIds: number[] = []
  const toDeleteIds: number[] = []

  for (const id of remoteIds) {
    if (!existingIds.has(id)) {
      toCreateIds.push(id)
    } else {
      toUpdateIds.push(id)
    }
  }

  for (const id of existingIds) {
    if (!remoteIds.has(id)) {
      toDeleteIds.push(id)
    }
  }

  return { toCreateIds, toUpdateIds, toDeleteIds }
}

/**
 * Sync mentor's Cal.com event types with local database
 */
export const syncMentorEventTypesForUser = async (
  userId: string,
  accessToken: string
): Promise<
  | { success: true; created: number; updated: number; deleted: number }
  | { success: false; error: string }
> => {
  try {
    const calUser = await getCalcomUsernameByUserId(userId)
    if (!calUser) {
      return { success: false, error: 'CALCOM_USERNAME_NOT_FOUND' }
    }

    // Fetch event types from Cal.com API
    const remote = await fetchCalcomEventTypesByUsername(calUser.calcomUsername, accessToken)

    const now = new Date()

    return await db.transaction(async () => {
      // Fetch existing event types for this mentor
      const existing = await getExistingEventTypesForSync(userId)

      const { toCreateIds, toUpdateIds, toDeleteIds } = computeEventTypeSyncPlan(existing, remote)

      // Build a map of existing event types for change detection
      const existingMap = new Map<
        number,
        { title: string; description: string | null; duration: number }
      >()
      for (const row of existing) {
        if (row.calcomEventTypeId) {
          existingMap.set(row.calcomEventTypeId, {
            title: row.title,
            description: row.description ?? null,
            duration: row.duration,
          })
        }
      }

      const createIdSet = new Set<number>(toCreateIds)
      const updateIdSet = new Set<number>(toUpdateIds)

      const valuesToUpsert: Array<{
        mentorUserId: string
        calcomEventTypeId: number
        title: string
        description: string | null
        duration: number
        isEnabled: boolean
        currency: string
        createdAt: Date
        updatedAt: Date
      }> = []

      let createdCount = 0
      let updatedCount = 0

      for (const r of remote) {
        if (createIdSet.has(r.id)) {
          valuesToUpsert.push({
            mentorUserId: userId,
            calcomEventTypeId: r.id,
            title: r.title,
            description: r.description ?? null,
            duration: r.lengthInMinutes,
            isEnabled: false,
            currency: 'USD',
            createdAt: now,
            updatedAt: now,
          })
          createdCount += 1
        } else if (updateIdSet.has(r.id)) {
          const existingMeta = existingMap.get(r.id)
          const changed =
            !existingMeta ||
            existingMeta.title !== r.title ||
            (existingMeta.description ?? null) !== (r.description ?? null) ||
            existingMeta.duration !== r.lengthInMinutes
          if (changed) {
            valuesToUpsert.push({
              mentorUserId: userId,
              calcomEventTypeId: r.id,
              title: r.title,
              description: r.description ?? null,
              duration: r.lengthInMinutes,
              isEnabled: false,
              currency: 'USD',
              createdAt: now,
              updatedAt: now,
            })
            updatedCount += 1
          }
        }
      }

      // Upsert event types
      if (valuesToUpsert.length > 0) {
        await upsertEventTypes(valuesToUpsert)
      }

      // Delete removed event types
      if (toDeleteIds.length > 0) {
        await deleteEventTypesByCalcomIds(userId, toDeleteIds)
      }

      return {
        success: true,
        created: createdCount,
        updated: updatedCount,
        deleted: toDeleteIds.length,
      }
    })
  } catch (error) {
    console.error('Failed to sync mentor event types:', error)
    const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR'
    return { success: false, error: errorMessage }
  }
}

/**
 * Update mentor event type preference
 */
export const updateMentorEventType = async (
  eventTypeId: number,
  data: UpdateMentorEventType
): Promise<void> => {
  await requireAuth()
  return updateEventTypeDal(eventTypeId, data)
}
