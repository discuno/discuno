import 'server-only'

import { eq } from 'drizzle-orm'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import { user as userTable } from '~/server/db/schema'

export const getOrCreateStripeCustomerId = async ({
  userId,
  email,
  name,
}: {
  userId: string
  email: string
  name?: string | null
}): Promise<string> => {
  const [discunoUser] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!discunoUser) throw new Error('Authenticated user was not found')

  if (discunoUser.stripeCustomerId) {
    const existingCustomer = await stripe.customers.retrieve(discunoUser.stripeCustomerId)
    if (!existingCustomer.deleted) {
      if (existingCustomer.email !== email || existingCustomer.name !== (name ?? null)) {
        await stripe.customers.update(existingCustomer.id, {
          email,
          name: name ?? undefined,
        })
      }
      return existingCustomer.id
    }
  }

  const customer = await stripe.customers.create(
    {
      email,
      name: name ?? undefined,
      metadata: { discunoUserId: userId },
    },
    {
      // A deleted customer needs a new key, while a failed local write can safely
      // replay the original key and recover the same Stripe object.
      idempotencyKey: `discuno:customer:v2:${userId}:${discunoUser.stripeCustomerId ?? 'initial'}`,
    }
  )

  await db
    .update(userTable)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(userTable.id, userId))

  return customer.id
}
