import { and, eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import * as schema from '~/server/db/schema/index'
import { extractEduDomainPrefix, reconcileMentorAccessForUser } from './mentor-access'

let supportedSchoolId: number

const createUser = async (
  values: Partial<typeof schema.user.$inferInsert> = {}
): Promise<typeof schema.user.$inferSelect> => {
  const [user] = await testDb
    .insert(schema.user)
    .values({
      name: 'Mentor access test user',
      email: `${crypto.randomUUID()}@umich.edu`,
      emailVerified: true,
      role: null,
      ...values,
    })
    .returning()

  if (!user) throw new Error('Failed to create mentor access test user')
  return user
}

const readUserRole = async (userId: string): Promise<string | null> => {
  const user = await testDb.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { role: true },
  })
  return user?.role ?? null
}

const readMatchingSchoolLinks = (userId: string) =>
  testDb.query.userSchool.findMany({
    where: and(
      eq(schema.userSchool.userId, userId),
      eq(schema.userSchool.schoolId, supportedSchoolId)
    ),
    orderBy: (link, { asc }) => [asc(link.id)],
  })

beforeAll(async () => {
  const [school] = await testDb
    .insert(schema.school)
    .values({
      name: 'University of Michigan',
      domainPrefix: 'umich',
      location: 'Ann Arbor, MI',
    })
    .returning({ id: schema.school.id })

  if (!school) throw new Error('Failed to create supported school fixture')
  supportedSchoolId = school.id
})

describe('extractEduDomainPrefix', () => {
  it('normalizes case and maps school subdomains to the supported prefix', () => {
    expect(extractEduDomainPrefix('student@UMICH.EDU')).toBe('umich')
    expect(extractEduDomainPrefix('student@terpmail.umd.edu')).toBe('umd')
  })

  it('rejects personal, malformed, and non-US academic addresses', () => {
    expect(extractEduDomainPrefix('student@example.com')).toBeNull()
    expect(extractEduDomainPrefix('student@umich..edu')).toBeNull()
    expect(extractEduDomainPrefix('student@school.edu.au')).toBeNull()
  })
})

describe('reconcileMentorAccessForUser', () => {
  it('serializes concurrent repairs into one mentor role and one active school link', async () => {
    const user = await createUser()

    const results = await Promise.all(
      Array.from({ length: 12 }, () => reconcileMentorAccessForUser(user.id))
    )

    expect(results.every(result => result.status === 'ready')).toBe(true)
    expect(
      results.filter(result => result.status === 'ready' && result.schoolLink === 'created')
    ).toHaveLength(1)
    expect(await readUserRole(user.id)).toBe('mentor')

    const links = await readMatchingSchoolLinks(user.id)
    expect(links).toHaveLength(1)
    expect(links[0]?.deletedAt).toBeNull()
  })

  it('restores the oldest matching soft-deleted link instead of inserting a duplicate', async () => {
    const user = await createUser({ role: 'user' })
    const [deletedLink] = await testDb
      .insert(schema.userSchool)
      .values({
        userId: user.id,
        schoolId: supportedSchoolId,
        deletedAt: new Date('2025-01-01T00:00:00.000Z'),
      })
      .returning()

    const result = await reconcileMentorAccessForUser(user.id)

    expect(result).toEqual({ status: 'ready', rolePromoted: true, schoolLink: 'restored' })
    expect(await readUserRole(user.id)).toBe('mentor')

    const links = await readMatchingSchoolLinks(user.id)
    expect(links).toHaveLength(1)
    expect(links[0]?.id).toBe(deletedLink?.id)
    expect(links[0]?.deletedAt).toBeNull()
  })

  it.each(['mentor', 'admin', 'admin,user', 'custom-role'])(
    'preserves the %s role while repairing the supported school link',
    async role => {
      const user = await createUser({ role })

      const result = await reconcileMentorAccessForUser(user.id)

      expect(result).toEqual({ status: 'ready', rolePromoted: false, schoolLink: 'created' })
      expect(await readUserRole(user.id)).toBe(role)
      expect(await readMatchingSchoolLinks(user.id)).toHaveLength(1)
    }
  )

  it.each([
    ['unverified-email', { emailVerified: false }],
    ['anonymous-user', { isAnonymous: true }],
    ['deleted-user', { deletedAt: new Date('2025-01-01T00:00:00.000Z') }],
    ['banned-user', { banned: true }],
    ['invalid-school-email', { email: `${crypto.randomUUID()}@example.com` }],
    ['invalid-school-email', { email: `${crypto.randomUUID()}@umich..edu` }],
    ['unsupported-school', { email: `${crypto.randomUUID()}@unsupported.edu` }],
  ] as const)('does not grant access for %s', async (reason, values) => {
    const user = await createUser(values)

    await expect(reconcileMentorAccessForUser(user.id)).resolves.toEqual({
      status: 'skipped',
      reason,
    })
    expect(await readUserRole(user.id)).toBeNull()
    expect(await readMatchingSchoolLinks(user.id)).toHaveLength(0)
  })

  it('does not mutate anything for an unknown user ID', async () => {
    await expect(reconcileMentorAccessForUser(crypto.randomUUID())).resolves.toEqual({
      status: 'skipped',
      reason: 'user-not-found',
    })
  })
})
