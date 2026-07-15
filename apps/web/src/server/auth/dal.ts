import 'server-only'

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { fetchCalcomEventTypesForUser } from '~/lib/calcom'
import { getCalcomAccessToken } from '~/lib/calcom/tokens'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import { calcomToken, mentorEventType } from '~/server/db/schema/index'

/**
 * Data Access Layer for authentication operations
 */

/**
 * Check if user has Cal.com integration already set up
 */
const getActiveCalcomIdentity = async (userId: string) => {
  return db.query.calcomToken.findFirst({
    where: and(
      eq(calcomToken.userId, userId),
      eq(calcomToken.authMode, 'oauth'),
      isNull(calcomToken.disconnectedAt),
      isNotNull(calcomToken.accessToken),
      isNotNull(calcomToken.refreshToken)
    ),
    columns: {
      id: true,
      calcomUserId: true,
      connectedAt: true,
    },
  })
}

type RemoteEventType = {
  id: number
  title: string
  lengthInMinutes: number
  description?: string
  bookingCompatibility: {
    compatible: boolean
    reasons: string[]
  }
}

type ExistingEventType = {
  calcomEventTypeId: number | null
}

/**
 * Compute which event types to create, update, and delete by comparing remote vs existing
 */
export function computeEventTypeSyncPlan(
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
 * Fetch mentor's Cal.com event types and upsert into local database
 * Intended to be called on first login after Cal.com integration is created
 */
export const syncMentorEventTypesForUser = async (
  userId: string
): Promise<
  | { success: true; created: number; updated: number; deleted: number }
  | { success: false; error: string }
> => {
  try {
    // Provider I/O happens before the connection lock so token refresh never
    // nests a second advisory-lock reservation. The generation is rechecked
    // under the lock before any remote account data is committed.
    const identity = await getActiveCalcomIdentity(userId)
    if (!identity) {
      return { success: false as const, error: 'CALCOM_CONNECTION_NOT_FOUND' }
    }
    const accessToken = await getCalcomAccessToken(userId)
    const remote = await fetchCalcomEventTypesForUser(userId, { accessToken })
    const now = new Date()

    return await withDatabaseAdvisoryLock(`discuno:calcom-connection:${userId}`, async () => {
      return db.transaction(async tx => {
        const currentIdentity = await tx.query.calcomToken.findFirst({
          where: and(
            eq(calcomToken.userId, userId),
            eq(calcomToken.id, identity.id),
            eq(calcomToken.calcomUserId, identity.calcomUserId),
            eq(calcomToken.authMode, 'oauth'),
            isNull(calcomToken.disconnectedAt),
            isNotNull(calcomToken.accessToken),
            isNotNull(calcomToken.refreshToken)
          ),
          columns: { connectedAt: true },
        })
        const connectionGenerationMatches =
          currentIdentity &&
          currentIdentity.connectedAt?.getTime() === identity.connectedAt?.getTime()
        if (!connectionGenerationMatches) {
          return { success: false as const, error: 'CALCOM_CONNECTION_CHANGED' }
        }

        // Fetch existing event types for this mentor (include metadata for change detection)
        const existing = await tx
          .select({
            calcomEventTypeId: mentorEventType.calcomEventTypeId,
            title: mentorEventType.title,
            description: mentorEventType.description,
            duration: mentorEventType.duration,
            bookingCompatible: mentorEventType.bookingCompatible,
            bookingCompatibilityReasons: mentorEventType.bookingCompatibilityReasons,
          })
          .from(mentorEventType)
          .where(eq(mentorEventType.mentorUserId, userId))

        const { toCreateIds, toUpdateIds, toDeleteIds } = computeEventTypeSyncPlan(existing, remote)

        const existingMap = new Map<
          number,
          {
            title: string
            description: string | null
            duration: number
            bookingCompatible: boolean | null
            bookingCompatibilityReasons: string[]
          }
        >()
        for (const row of existing) {
          existingMap.set(row.calcomEventTypeId, {
            title: row.title,
            description: row.description ?? null,
            duration: row.duration,
            bookingCompatible: row.bookingCompatible,
            bookingCompatibilityReasons: row.bookingCompatibilityReasons,
          })
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
          bookingCompatible: boolean
          bookingCompatibilityReasons: string[]
          bookingCompatibilityCheckedAt: Date
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
              bookingCompatible: r.bookingCompatibility.compatible,
              bookingCompatibilityReasons: r.bookingCompatibility.reasons,
              bookingCompatibilityCheckedAt: now,
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
              existingMeta.duration !== r.lengthInMinutes ||
              existingMeta.bookingCompatible !== r.bookingCompatibility.compatible ||
              JSON.stringify(existingMeta.bookingCompatibilityReasons) !==
                JSON.stringify(r.bookingCompatibility.reasons)
            if (changed) {
              valuesToUpsert.push({
                mentorUserId: userId,
                calcomEventTypeId: r.id,
                title: r.title,
                description: r.description ?? null,
                duration: r.lengthInMinutes,
                isEnabled: false,
                currency: 'USD',
                bookingCompatible: r.bookingCompatibility.compatible,
                bookingCompatibilityReasons: r.bookingCompatibility.reasons,
                bookingCompatibilityCheckedAt: now,
                createdAt: now,
                updatedAt: now,
              })
              updatedCount += 1
            }
          }
        }

        if (valuesToUpsert.length > 0) {
          await tx
            .insert(mentorEventType)
            .values(valuesToUpsert)
            .onConflictDoUpdate({
              target: mentorEventType.calcomEventTypeId,
              set: {
                title: sql`excluded.title`,
                description: sql`excluded.description`,
                duration: sql`excluded.duration`,
                bookingCompatible: sql`excluded.booking_compatible`,
                bookingCompatibilityReasons: sql`excluded.booking_compatibility_reasons`,
                bookingCompatibilityCheckedAt: sql`excluded.booking_compatibility_checked_at`,
                updatedAt: now,
              },
            })
        }

        if (toDeleteIds.length > 0) {
          await tx
            .delete(mentorEventType)
            .where(
              and(
                eq(mentorEventType.mentorUserId, userId),
                inArray(mentorEventType.calcomEventTypeId, toDeleteIds)
              )
            )
        }

        return {
          success: true as const,
          created: createdCount,
          updated: updatedCount,
          deleted: toDeleteIds.length,
        }
      })
    })
  } catch (error) {
    console.error('Failed to sync mentor event types', {
      userId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return { success: false, error: 'CALCOM_EVENT_TYPE_SYNC_FAILED' }
  }
}
