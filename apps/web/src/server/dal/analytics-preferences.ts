import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { user } from '~/server/db/schema'

/**
 * Read the durable optional-analytics preference for a Discuno user.
 * null represents either an unset preference or a missing user; authenticated
 * update callers distinguish a missing row through the update result.
 */
export const getUserAnalyticsPreference = async (userId: string): Promise<boolean | null> => {
  const record = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { analyticsEnabled: true },
  })

  return record?.analyticsEnabled ?? null
}

/** Persist optional-analytics consent for the authenticated user only. */
export const updateUserAnalyticsPreference = async (
  userId: string,
  analyticsEnabled: boolean
): Promise<boolean | null> => {
  const [record] = await db
    .update(user)
    .set({ analyticsEnabled, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ analyticsEnabled: user.analyticsEnabled })

  return record?.analyticsEnabled ?? null
}
