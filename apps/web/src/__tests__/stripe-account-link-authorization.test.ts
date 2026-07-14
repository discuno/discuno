import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  createAccountLink: vi.fn(),
  createLoginLink: vi.fn(),
  getMentorStripeAccount: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('~/env', () => ({
  env: { BETTER_AUTH_URL: 'https://discuno.test' },
}))

vi.mock('~/lib/calcom', () => ({
  getCalcomSchedules: vi.fn(),
  updateCalcomSchedule: vi.fn(),
}))

vi.mock('~/lib/services/booking-service', () => ({ cancelOwnedMentorBooking: vi.fn() }))
vi.mock('~/lib/services/calcom-service', () => ({ updateMentorEventType: vi.fn() }))
vi.mock('~/lib/services/stripe-service', () => ({ upsertMentorStripeAccount: vi.fn() }))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    accountLinks: { create: mocks.createAccountLink },
    accounts: {
      create: mocks.createAccount,
      createLoginLink: mocks.createLoginLink,
    },
  },
}))

vi.mock('~/server/queries/bookings', () => ({ getMentorBookings: vi.fn() }))
vi.mock('~/server/queries/calcom', () => ({ getMentorCalcomConnection: vi.fn() }))
vi.mock('~/server/queries/event-types', () => ({ getMentorEventTypes: vi.fn() }))
vi.mock('~/server/queries/profiles', () => ({ getFullProfile: vi.fn() }))
vi.mock('~/server/queries/stripe', () => ({
  getMentorStripeAccount: mocks.getMentorStripeAccount,
}))

import {
  createStripeAccountLink,
  createStripeLoginLink,
} from '~/app/(app)/(mentor)/settings/actions'

const ownerAccount = {
  stripeAccountId: 'acct_owned_by_authenticated_mentor',
  stripeAccountStatus: 'active',
  payoutsEnabled: true,
  chargesEnabled: true,
}

describe('Stripe connected-account link authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getMentorStripeAccount.mockResolvedValue(ownerAccount)
    mocks.createAccountLink.mockResolvedValue({ url: 'https://connect.stripe.test/account-link' })
    mocks.createLoginLink.mockResolvedValue({ url: 'https://connect.stripe.test/login-link' })
  })

  it('ignores an injected account ID and creates an account link for the stored mentor account', async () => {
    const invokeWithForgedInput = createStripeAccountLink as unknown as (input: {
      accountId: string
      type: 'account_update'
      collectionOptions: 'currently_due'
    }) => ReturnType<typeof createStripeAccountLink>

    const result = await invokeWithForgedInput({
      accountId: 'acct_owned_by_another_mentor',
      type: 'account_update',
      collectionOptions: 'currently_due',
    })

    expect(result).toEqual({ success: true, url: 'https://connect.stripe.test/account-link' })
    expect(mocks.getMentorStripeAccount).toHaveBeenCalledOnce()
    expect(mocks.createAccountLink).toHaveBeenCalledWith({
      account: ownerAccount.stripeAccountId,
      refresh_url: 'https://discuno.test/settings/event-types?stripe_refresh=true',
      return_url: 'https://discuno.test/settings/event-types?stripe_setup=success',
      type: 'account_update',
      collection_options: { fields: 'currently_due' },
    })
  })

  it('ignores a forged positional argument and creates a dashboard link for the stored account', async () => {
    const invokeWithForgedAccountId = createStripeLoginLink as unknown as (
      accountId: string
    ) => ReturnType<typeof createStripeLoginLink>

    const result = await invokeWithForgedAccountId('acct_owned_by_another_mentor')

    expect(result).toEqual({ success: true, url: 'https://connect.stripe.test/login-link' })
    expect(mocks.getMentorStripeAccount).toHaveBeenCalledOnce()
    expect(mocks.createLoginLink).toHaveBeenCalledWith(ownerAccount.stripeAccountId)
  })

  it('does not call Stripe when the authenticated mentor has no stored account', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(null)

    await expect(createStripeAccountLink()).resolves.toEqual({
      success: false,
      error: 'Stripe account not found',
    })
    await expect(createStripeLoginLink()).resolves.toEqual({
      success: false,
      error: 'Stripe account not found',
    })

    expect(mocks.createAccountLink).not.toHaveBeenCalled()
    expect(mocks.createLoginLink).not.toHaveBeenCalled()
  })
})
