import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { anonymousUserLink, user } from '~/server/db/schema'

/**
 * Resolve a user ID captured by an asynchronous provider before an anonymous
 * account was linked. A mapping wins even while the old guest row still
 * exists. Returning null is safe for nullable attribution foreign keys and
 * means neither a live user nor a live linked destination exists.
 */
export const resolveCanonicalUserId = async (capturedUserId: string): Promise<string | null> => {
  const findMapping = () =>
    db.query.anonymousUserLink.findFirst({
      where: eq(anonymousUserLink.anonymousUserId, capturedUserId),
      columns: { linkedUserId: true },
    })
  const findUser = (userId: string) =>
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true },
    })

  const mapping = await findMapping()
  if (mapping) return (await findUser(mapping.linkedUserId))?.id ?? null

  const existingUser = await findUser(capturedUserId)
  if (existingUser) return existingUser.id

  // The link transaction may have committed between the two reads, deleting
  // the guest immediately afterward. Re-read before classifying it as an
  // unmapped deletion so that normal conversion cannot lose attribution.
  const concurrentMapping = await findMapping()
  return concurrentMapping ? ((await findUser(concurrentMapping.linkedUserId))?.id ?? null) : null
}
