import 'server-only'

import { eq } from 'drizzle-orm'
import type { NewMentorStripeAccount } from '~/lib/schemas/db'
import { insertMentorStripeAccountSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { mentorStripeAccount } from '~/server/db/schema'

/**
 * Data Access Layer for Stripe accounts
 * Raw database operations with no caching or auth checks
 */

/**
 * Get mentor's Stripe account by user ID
 */
export const getStripeAccountByUserId = async (userId: string) => {
  const result = await db.query.mentorStripeAccount.findFirst({
    where: eq(mentorStripeAccount.userId, userId),
  })

  if (!result) return null

  return {
    ...result,
    stripeAccountStatus: result.stripeAccountStatus ?? 'pending',
    requirements: result.requirements ?? {},
  }
}

/**
 * Upsert mentor Stripe account (insert or update)
 */
export const upsertStripeAccount = async (data: NewMentorStripeAccount): Promise<void> => {
  const validData = insertMentorStripeAccountSchema.parse(data)

  await db
    .insert(mentorStripeAccount)
    .values(validData)
    .onConflictDoUpdate({
      target: mentorStripeAccount.userId,
      set: {
        ...validData,
        updatedAt: new Date(),
      },
    })
}
