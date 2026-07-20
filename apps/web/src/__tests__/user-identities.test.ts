import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findIdentityLink: vi.fn(),
  findUser: vi.fn(),
}))

vi.mock('~/server/db', () => ({
  db: {
    query: {
      anonymousUserLink: { findFirst: mocks.findIdentityLink },
      user: { findFirst: mocks.findUser },
    },
  },
}))

import { resolveCanonicalUserId } from '~/server/dal/user-identities'

const anonymousUserId = '11111111-1111-4111-8111-111111111111'
const linkedUserId = '22222222-2222-4222-8222-222222222222'

describe('resolveCanonicalUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findIdentityLink.mockResolvedValue(undefined)
    mocks.findUser.mockResolvedValue({ id: anonymousUserId })
  })

  it('prefers the durable linked identity even while the guest row may still exist', async () => {
    mocks.findIdentityLink.mockResolvedValue({ linkedUserId })
    mocks.findUser.mockResolvedValue({ id: linkedUserId })

    await expect(resolveCanonicalUserId(anonymousUserId)).resolves.toBe(linkedUserId)
  })

  it('keeps an existing user ID when it was never linked', async () => {
    await expect(resolveCanonicalUserId(anonymousUserId)).resolves.toBe(anonymousUserId)
  })

  it('returns null for a deleted and unmapped identity', async () => {
    mocks.findUser.mockResolvedValue(undefined)

    await expect(resolveCanonicalUserId(anonymousUserId)).resolves.toBeNull()
  })

  it('does not fall back to a stale guest ID when the linked account was deleted', async () => {
    mocks.findIdentityLink.mockResolvedValue({ linkedUserId })
    mocks.findUser.mockResolvedValue(undefined)

    await expect(resolveCanonicalUserId(anonymousUserId)).resolves.toBeNull()
  })

  it('re-reads a mapping that commits while the guest account is being deleted', async () => {
    mocks.findIdentityLink.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ linkedUserId })
    mocks.findUser.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: linkedUserId })

    await expect(resolveCanonicalUserId(anonymousUserId)).resolves.toBe(linkedUserId)
  })
})
