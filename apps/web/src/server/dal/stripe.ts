import 'server-only'

import { eq } from 'drizzle-orm'
import type { NewMentorStripeAccount } from '~/lib/schemas/db'
import { insertMentorStripeAccountSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { mentorStripeAccount } from '~/server/db/schema/index'

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

export const getStripeAccountByStripeId = async (stripeAccountId: string) => {
  return (
    (await db.query.mentorStripeAccount.findFirst({
      where: eq(mentorStripeAccount.stripeAccountId, stripeAccountId),
    })) ?? null
  )
}

export const markStripeAccountDeleted = async (stripeAccountId: string) => {
  const [updated] = await db
    .update(mentorStripeAccount)
    .set({
      stripeAccountStatus: 'inactive',
      chargesEnabled: false,
      payoutsEnabled: false,
      transfersEnabled: false,
      detailsSubmitted: false,
      requirements: { disabledReason: 'account_deleted' },
      updatedAt: new Date(),
    })
    .where(eq(mentorStripeAccount.stripeAccountId, stripeAccountId))
    .returning({ userId: mentorStripeAccount.userId })
  return updated ?? null
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
