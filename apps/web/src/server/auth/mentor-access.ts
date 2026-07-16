import 'server-only'

import { and, asc, eq, isNull, or } from 'drizzle-orm'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'

const EDU_EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.edu$/i

export type MentorAccessReconciliationResult =
  | {
      status: 'skipped'
      reason:
        | 'user-not-found'
        | 'anonymous-user'
        | 'deleted-user'
        | 'banned-user'
        | 'unverified-email'
        | 'invalid-school-email'
        | 'unsupported-school'
    }
  | {
      status: 'ready'
      rolePromoted: boolean
      schoolLink: 'existing' | 'restored' | 'created'
    }

/**
 * Extract the school identifier Discuno stores for a valid US .edu address.
 * Subdomains intentionally collapse to the label immediately before `.edu`:
 * `terpmail.umd.edu` and `umd.edu` both map to `umd`.
 */
export const extractEduDomainPrefix = (email: string): string | null => {
  if (!EDU_EMAIL_PATTERN.test(email)) return null

  const domain = email.split('@')[1]?.toLowerCase()
  const match = domain?.match(/([^.]+)\.edu$/)
  return match?.[1] ?? null
}

/**
 * Repair mentor authorization for a successfully authenticated legacy user.
 *
 * The user row is locked before eligibility is evaluated, which serializes
 * simultaneous session creation for the same account. Authorization and the
 * matching school association are then changed in one transaction. Only the
 * ordinary `user` role (or a legacy null role) can be promoted; admin and
 * custom roles are always preserved.
 */
export const reconcileMentorAccessForUser = async (
  userId: string
): Promise<MentorAccessReconciliationResult> =>
  db.transaction(async tx => {
    const [user] = await tx
      .select({
        id: schema.user.id,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        isAnonymous: schema.user.isAnonymous,
        deletedAt: schema.user.deletedAt,
        banned: schema.user.banned,
        role: schema.user.role,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .for('update')

    if (!user) return { status: 'skipped', reason: 'user-not-found' }
    if (user.isAnonymous) return { status: 'skipped', reason: 'anonymous-user' }
    if (user.deletedAt) return { status: 'skipped', reason: 'deleted-user' }
    if (user.banned) return { status: 'skipped', reason: 'banned-user' }
    if (!user.emailVerified) return { status: 'skipped', reason: 'unverified-email' }

    const domainPrefix = extractEduDomainPrefix(user.email)
    if (!domainPrefix) return { status: 'skipped', reason: 'invalid-school-email' }

    const [school] = await tx
      .select({ id: schema.school.id })
      .from(schema.school)
      .where(eq(schema.school.domainPrefix, domainPrefix))
      .limit(1)

    if (!school) return { status: 'skipped', reason: 'unsupported-school' }

    const links = await tx
      .select({ id: schema.userSchool.id, deletedAt: schema.userSchool.deletedAt })
      .from(schema.userSchool)
      .where(and(eq(schema.userSchool.userId, user.id), eq(schema.userSchool.schoolId, school.id)))
      .orderBy(asc(schema.userSchool.id))

    const activeLink = links.find(link => link.deletedAt === null)
    const deletedLink = links.find(link => link.deletedAt !== null)
    const now = new Date()

    let schoolLink: 'existing' | 'restored' | 'created'
    if (activeLink) {
      schoolLink = 'existing'
    } else if (deletedLink) {
      await tx
        .update(schema.userSchool)
        .set({ deletedAt: null, updatedAt: now })
        .where(eq(schema.userSchool.id, deletedLink.id))
      schoolLink = 'restored'
    } else {
      await tx.insert(schema.userSchool).values({ userId: user.id, schoolId: school.id })
      schoolLink = 'created'
    }

    const rolePromoted = user.role === null || user.role === 'user'
    if (rolePromoted) {
      await tx
        .update(schema.user)
        .set({ role: 'mentor', updatedAt: now })
        .where(
          and(
            eq(schema.user.id, user.id),
            or(isNull(schema.user.role), eq(schema.user.role, 'user'))
          )
        )
    }

    return { status: 'ready', rolePromoted, schoolLink }
  })
