import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  insertValues: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  where: vi.fn(),
}))

vi.mock('~/server/db', () => ({
  db: {
    insert: mocks.insert,
    query: { mentorStripeAccount: { findFirst: vi.fn() } },
    update: mocks.update,
  },
}))

import { markStripeAccountDeleted, upsertStripeAccount } from '~/server/dal/stripe'

describe('Stripe account deletion persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.returning.mockResolvedValue([{ userId: 'mentor-user-id' }])
    mocks.onConflictDoUpdate.mockResolvedValue(undefined)
    mocks.insertValues.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate })
    mocks.insert.mockReturnValue({ values: mocks.insertValues })
    mocks.where.mockReturnValue({ returning: mocks.returning })
    mocks.set.mockReturnValue({ where: mocks.where })
    mocks.update.mockReturnValue({ set: mocks.set })
  })

  it('fails every local payment capability closed for a deleted account', async () => {
    await expect(markStripeAccountDeleted('acct_stored_123')).resolves.toEqual({
      userId: 'mentor-user-id',
    })

    expect(mocks.set).toHaveBeenCalledWith({
      stripeAccountStatus: 'inactive',
      chargesEnabled: false,
      payoutsEnabled: false,
      transfersEnabled: false,
      detailsSubmitted: false,
      requirements: { disabledReason: 'account_deleted' },
      updatedAt: expect.any(Date),
    })
    expect(mocks.returning).toHaveBeenCalledOnce()
  })

  it('rotates only the current mentor mapping to a replacement account ID', async () => {
    const replacement = {
      userId: '11111111-1111-4111-8111-111111111111',
      stripeAccountId: 'acct_replacement_456',
      stripeAccountStatus: 'pending' as const,
      payoutsEnabled: false,
      chargesEnabled: false,
      transfersEnabled: false,
      detailsSubmitted: false,
      requirements: { currently_due: [] },
    }

    await upsertStripeAccount(replacement)

    expect(mocks.insertValues).toHaveBeenCalledWith(replacement)
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          userId: replacement.userId,
          stripeAccountId: replacement.stripeAccountId,
          updatedAt: expect.any(Date),
        }),
      })
    )
  })
})
