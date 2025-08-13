import 'server-only'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { cache } from 'react'
import { createCalcomUser, fetchCalcomEventTypesByUsername } from '~/lib/calcom'
import { db } from '~/server/db'
import { calcomTokens, mentorEventTypes } from '~/server/db/schema'
import { getCalcomUsernameByUserId } from '~/server/queries'

/**
 * Data Access Layer for authentication operations
 * Following Next.js 2025 best practices for centralized auth logic
 */

/**
 * Check if user has Cal.com integration already set up
 */
export const hasCalcomIntegration = cache(async (userId: string): Promise<boolean> => {
  try {
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })
    return !!token
  } catch (error) {
    console.error('Error checking Cal.com integration:', error)
    return false
  }
})

/**
 * Create Cal.com managed user for a newly authenticated user
 * This function MUST succeed for authentication to complete
 * Throws an error if Cal.com integration fails
 */
export const createCalcomUserForNewUser = async ({
  userId,
  email,
  name,
  image,
}: {
  userId: string
  email: string
  name: string | null
  image: string | null
}): Promise<{ calcomUserId: number; username: string }> => {
  // Check if user already has Cal.com integration
  const hasIntegration = await hasCalcomIntegration(userId)
  if (hasIntegration) {
    console.log(`User ${userId} already has Cal.com integration, skipping creation`)
    // Get existing Cal.com user info
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })
    if (!token) {
      throw new Error('Cal.com integration check failed: token not found')
    }
    return {
      calcomUserId: token.calcomUserId,
      username: token.calcomUsername,
    }
  }

  // Create Cal.com managed user
  console.log(`Creating Cal.com user for new user: ${email}`)

  try {
    const calcomResult = await createCalcomUser({
      userId, // Pass the userId to avoid authentication check
      email,
      name: name ?? email.split('@')[0] ?? 'Mentor', // Fallback name
      timeZone: 'America/New_York', // Default timezone
      avatarUrl: image ?? undefined,
      bio: 'Mentor on Discuno - helping students navigate college life',
      metadata: {
        source: 'discuno-signup',
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`Cal.com user created successfully for ${email}:`, {
      calcomUserId: calcomResult.calcomUserId,
      username: calcomResult.username,
    })

    return calcomResult
  } catch (error) {
    console.error(`Failed to create Cal.com user for ${email}:`, error)

    // Throw a user-friendly error that will prevent authentication
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`Cal.com integration required: ${errorMessage}`)
  }
}

/**
 * Enforce Cal.com user creation during authentication
 * This function attempts to create Cal.com integration and logs results
 * Note: When called from events.signIn, this cannot prevent authentication
 */
export const enforceCalcomIntegration = async (userData: {
  userId: string
  email: string
  name: string | null
  image: string | null
}): Promise<{ success: boolean; error?: string }> => {
  try {
    await createCalcomUserForNewUser(userData)
    console.log(`Cal.com integration enforced successfully for ${userData.email}`)
    return { success: true }
  } catch (error) {
    console.error(`Cal.com integration enforcement failed for ${userData.email}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}

type RemoteEventType = {
  id: number
  title: string
  lengthInMinutes: number
  description?: string
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
    // 1) Lightweight username lookup
    const calUser = await getCalcomUsernameByUserId(userId)
    if (!calUser) {
      return { success: false, error: 'CALCOM_USERNAME_NOT_FOUND' }
    }

    // 2) Fetch remote event types from Cal.com
    const remote = await fetchCalcomEventTypesByUsername(calUser.calcomUsername)

    // 3) Single timestamp for consistency
    const now = new Date()

    // 4-6) Transaction: compute diff, batch upsert, batch delete
    return await db.transaction(async tx => {
      // Fetch existing event types for this mentor (include metadata for change detection)
      const existing = await tx
        .select({
          calcomEventTypeId: mentorEventTypes.calcomEventTypeId,
          title: mentorEventTypes.title,
          description: mentorEventTypes.description,
          duration: mentorEventTypes.duration,
        })
        .from(mentorEventTypes)
        .where(eq(mentorEventTypes.mentorUserId, userId))

      const { toCreateIds, toUpdateIds, toDeleteIds } = computeEventTypeSyncPlan(existing, remote)

      // Build map of existing metadata for quick comparison
      const existingMap = new Map<
        number,
        { title: string; description: string | null; duration: number }
      >()
      for (const row of existing) {
        if (row.calcomEventTypeId !== null) {
          existingMap.set(row.calcomEventTypeId, {
            title: row.title,
            description: row.description ?? null,
            duration: row.duration,
          })
        }
      }

      const createIdSet = new Set<number>(toCreateIds)
      const updateIdSet = new Set<number>(toUpdateIds)

      // Prepare values only for rows that need insert or metadata update
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

      // Batch upsert: update only metadata fields (title, description, duration, updatedAt)
      if (valuesToUpsert.length > 0) {
        await tx
          .insert(mentorEventTypes)
          .values(valuesToUpsert)
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

      // Batch delete missing event types for this mentor
      if (toDeleteIds.length > 0) {
        await tx
          .delete(mentorEventTypes)
          .where(
            and(
              eq(mentorEventTypes.mentorUserId, userId),
              inArray(mentorEventTypes.calcomEventTypeId, toDeleteIds)
            )
          )
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
