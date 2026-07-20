import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStripeAccountByUserId: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('react', () => ({ cache: (callback: unknown) => callback }))

vi.mock('~/lib/auth/auth-utils', () => ({
  requirePermission: mocks.requirePermission,
}))

vi.mock('~/server/dal/stripe', () => ({
  getStripeAccountByUserId: mocks.getStripeAccountByUserId,
}))

import { getMentorStripeAccount } from '~/server/queries/stripe'

describe('mentor Stripe account query authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('looks up only the authenticated mentor after enforcing mentor permission', async () => {
    const account = { stripeAccountId: 'acct_owned_by_authenticated_mentor' }
    mocks.requirePermission.mockResolvedValue({ user: { id: 'mentor-user-id' } })
    mocks.getStripeAccountByUserId.mockResolvedValue(account)

    await expect(getMentorStripeAccount()).resolves.toBe(account)

    expect(mocks.requirePermission).toHaveBeenCalledWith({ mentor: ['manage'] })
    expect(mocks.getStripeAccountByUserId).toHaveBeenCalledWith('mentor-user-id')
  })

  it('does not access the DAL when mentor permission is denied', async () => {
    mocks.requirePermission.mockRejectedValue(new Error('Not authorized'))

    await expect(getMentorStripeAccount()).rejects.toThrow('Not authorized')
    expect(mocks.getStripeAccountByUserId).not.toHaveBeenCalled()
  })
})
