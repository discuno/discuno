import { PgDialect } from 'drizzle-orm/pg-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  where: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requirePermission: mocks.requirePermission,
}))

vi.mock('~/lib/schemas/db', () => ({
  updateMentorEventTypeSchema: { parse: (data: unknown) => data },
}))

vi.mock('~/server/db', () => ({
  db: {
    update: mocks.update,
  },
}))

import { updateMentorEventType } from '~/server/queries/event-types'

describe('mentor event-type update authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockReturnValue({ set: mocks.set })
    mocks.set.mockReturnValue({ where: mocks.where })
    mocks.where.mockReturnValue({ returning: mocks.returning })
  })

  it("cannot update another mentor's event type", async () => {
    const authenticatedMentorId = '11111111-1111-4111-8111-111111111111'
    const otherMentorEventTypeId = 9876
    mocks.requirePermission.mockResolvedValue({ user: { id: authenticatedMentorId } })
    // PostgreSQL returns no row when the event ID exists but its mentor_user_id
    // does not match the authenticated mentor included in the update predicate.
    mocks.returning.mockResolvedValue([])

    await expect(
      updateMentorEventType(otherMentorEventTypeId, {
        customPrice: 500,
        currency: 'USD',
        isEnabled: true,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })

    expect(mocks.requirePermission).toHaveBeenCalledWith({ mentor: ['manage'] })
    const condition = mocks.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(new PgDialect().sqlToQuery(condition).params).toEqual([
      otherMentorEventTypeId,
      authenticatedMentorId,
    ])
  })
})
