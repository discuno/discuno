import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionNotFreshError } from '~/lib/errors'

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  createAccountLink: vi.fn(),
  createLoginLink: vi.fn(),
  listAccounts: vi.fn(),
  markStripeAccountDeleted: vi.fn(),
  retrieveAccount: vi.fn(),
  getFullProfile: vi.fn(),
  getMentorStripeAccount: vi.fn(),
  requireFreshAuth: vi.fn(),
  upsertMentorStripeAccount: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('~/env', () => ({
  env: { NEXT_PUBLIC_BASE_URL: 'https://discuno.test' },
}))

vi.mock('~/lib/calcom', () => ({
  getCalcomSchedules: vi.fn(),
  updateCalcomSchedule: vi.fn(),
}))

vi.mock('~/lib/services/booking-service', () => ({ cancelOwnedMentorBooking: vi.fn() }))
vi.mock('~/lib/services/calcom-service', () => ({ updateMentorEventType: vi.fn() }))
vi.mock('~/lib/services/stripe-service', () => ({
  upsertMentorStripeAccount: mocks.upsertMentorStripeAccount,
}))

vi.mock('~/lib/auth/auth-utils', () => ({ requireFreshAuth: mocks.requireFreshAuth }))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    accountLinks: { create: mocks.createAccountLink },
    accounts: {
      create: mocks.createAccount,
      createLoginLink: mocks.createLoginLink,
      list: mocks.listAccounts,
      retrieve: mocks.retrieveAccount,
    },
  },
}))

vi.mock('~/server/queries/bookings', () => ({ getMentorBookings: vi.fn() }))
vi.mock('~/server/queries/calcom', () => ({ getMentorCalcomConnection: vi.fn() }))
vi.mock('~/server/queries/event-types', () => ({ getMentorEventTypes: vi.fn() }))
vi.mock('~/server/queries/profiles', () => ({ getFullProfile: mocks.getFullProfile }))
vi.mock('~/server/dal/stripe', () => ({
  markStripeAccountDeleted: mocks.markStripeAccountDeleted,
}))
vi.mock('~/server/queries/stripe', () => ({
  getMentorStripeAccount: mocks.getMentorStripeAccount,
}))

import {
  createStripeAccountLink,
  createStripeConnectAccount,
  createStripeLoginLink,
  getMentorStripeStatus,
} from '~/app/(app)/(mentor)/settings/actions'

const ownerAccount = {
  userId: 'mentor-user-id',
  stripeAccountId: 'acct_owned_by_authenticated_mentor',
  stripeAccountStatus: 'active',
  payoutsEnabled: true,
  chargesEnabled: true,
  transfersEnabled: true,
  requirements: {},
}

const deletedStoredAccount = {
  ...ownerAccount,
  stripeAccountId: 'acct_confirmed_deleted',
  stripeAccountStatus: 'inactive',
  payoutsEnabled: false,
  chargesEnabled: false,
  transfersEnabled: false,
  requirements: { disabledReason: 'account_deleted' },
}

const stripeAccount = (
  id: string,
  metadata: Record<string, string> = { userId: 'mentor-user-id' }
) => ({
  id,
  object: 'account',
  metadata,
  payouts_enabled: false,
  charges_enabled: false,
  capabilities: { transfers: 'inactive' },
  details_submitted: false,
  requirements: { currently_due: [] },
})

const replacementGeneration = crypto
  .createHash('sha256')
  .update('discuno-connect-account-replacement-v1')
  .update('\0')
  .update('mentor-user-id')
  .update('\0')
  .update(deletedStoredAccount.stripeAccountId)
  .digest('hex')

const stripeResourceMissingError = () =>
  Object.assign(new Error('No such account'), { code: 'resource_missing' })

describe('Stripe connected-account link authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireFreshAuth.mockResolvedValue({
      session: { userId: 'mentor-user-id', createdAt: new Date() },
      user: { id: 'mentor-user-id', role: 'mentor' },
    })
    mocks.getFullProfile.mockResolvedValue({
      userId: 'mentor-user-id',
      email: 'mentor@example.edu',
      name: 'Mentor Student',
    })
    mocks.getMentorStripeAccount.mockResolvedValue(ownerAccount)
    mocks.createAccount.mockResolvedValue(stripeAccount('acct_new_for_authenticated_mentor'))
    mocks.listAccounts.mockReturnValue([])
    mocks.retrieveAccount.mockResolvedValue(stripeAccount(ownerAccount.stripeAccountId))
    mocks.createAccountLink.mockResolvedValue({ url: 'https://connect.stripe.test/account-link' })
    mocks.createLoginLink.mockResolvedValue({ url: 'https://connect.stripe.test/login-link' })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requires a fresh session before creating a connected payout account', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(null)

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.requireFreshAuth).toHaveBeenCalledOnce()
    expect(mocks.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mentor@example.edu',
        metadata: { userId: 'mentor-user-id' },
      }),
      { idempotencyKey: 'discuno-connect-account-v1-mentor-user-id' }
    )
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'mentor-user-id',
        stripeAccountId: 'acct_new_for_authenticated_mentor',
      })
    )
  })

  it('recovers an ambiguously created initial account before issuing another create', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(null)
    const recoveredAccount = stripeAccount('acct_recovered_initial')
    mocks.listAccounts.mockReturnValue([recoveredAccount])

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'mentor-user-id',
        stripeAccountId: recoveredAccount.id,
      })
    )
  })

  it('keeps an ordinary incomplete account resumable without rotating it', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue({
      ...ownerAccount,
      stripeAccountStatus: 'restricted',
      payoutsEnabled: false,
      transfersEnabled: false,
      requirements: { currentlyDue: ['individual.verification.document'] },
    })

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.retrieveAccount).not.toHaveBeenCalled()
    expect(mocks.listAccounts).not.toHaveBeenCalled()
    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.upsertMentorStripeAccount).not.toHaveBeenCalled()
  })

  it('reconciles payout readiness from Stripe instead of trusting stale local status', async () => {
    mocks.retrieveAccount.mockResolvedValue(stripeAccount(ownerAccount.stripeAccountId))

    await expect(getMentorStripeStatus()).resolves.toEqual({
      success: true,
      data: {
        hasAccount: true,
        onboardingCompleted: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        transfersEnabled: false,
        stripeAccountStatus: 'pending',
      },
    })

    expect(mocks.retrieveAccount).toHaveBeenCalledWith(ownerAccount.stripeAccountId)
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'mentor-user-id',
        stripeAccountId: ownerAccount.stripeAccountId,
        payoutsEnabled: false,
        transfersEnabled: false,
      })
    )
  })

  it('reports payouts ready only after Stripe enables transfers and payouts', async () => {
    mocks.retrieveAccount.mockResolvedValue({
      ...stripeAccount(ownerAccount.stripeAccountId),
      payouts_enabled: true,
      charges_enabled: false,
      capabilities: { transfers: 'active' },
      details_submitted: true,
    })

    await expect(getMentorStripeStatus()).resolves.toEqual({
      success: true,
      data: {
        hasAccount: true,
        onboardingCompleted: true,
        payoutsEnabled: true,
        chargesEnabled: false,
        transfersEnabled: true,
        stripeAccountStatus: 'active',
      },
    })
  })

  it('marks a provider-missing account inactive while reconciling status', async () => {
    mocks.retrieveAccount.mockRejectedValue(stripeResourceMissingError())

    await expect(getMentorStripeStatus()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        hasAccount: true,
        onboardingCompleted: false,
        payoutsEnabled: false,
        transfersEnabled: false,
        stripeAccountStatus: 'inactive',
      }),
    })

    expect(mocks.markStripeAccountDeleted).toHaveBeenCalledWith(ownerAccount.stripeAccountId)
  })

  it('replaces a provider-confirmed deleted account with a deterministic private generation', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    mocks.retrieveAccount.mockRejectedValue(stripeResourceMissingError())
    const replacement = stripeAccount('acct_replacement')
    mocks.createAccount.mockResolvedValue(replacement)

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.retrieveAccount).toHaveBeenCalledWith(deletedStoredAccount.stripeAccountId)
    expect(mocks.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        controller: {
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'stripe',
          stripe_dashboard: { type: 'express' },
        },
        capabilities: { transfers: { requested: true } },
        metadata: {
          userId: 'mentor-user-id',
          discunoConnectGeneration: replacementGeneration,
        },
      }),
      {
        idempotencyKey: `discuno-connect-account-replacement-v1-${replacementGeneration}`,
      }
    )
    expect(JSON.stringify(mocks.createAccount.mock.calls)).not.toContain(
      deletedStoredAccount.stripeAccountId
    )
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'mentor-user-id',
        stripeAccountId: replacement.id,
      })
    )
  })

  it('does not rotate the stored account when Stripe cannot confirm deletion', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    mocks.retrieveAccount.mockRejectedValue(new Error('temporary provider outage'))

    await expect(createStripeConnectAccount()).resolves.toEqual({
      success: false,
      error:
        'We could not restart payout setup. Please try again, or contact support if the problem continues.',
    })

    expect(mocks.listAccounts).not.toHaveBeenCalled()
    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.upsertMentorStripeAccount).not.toHaveBeenCalled()
  })

  it('recovers an ambiguously created replacement by its generation metadata', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    mocks.retrieveAccount.mockResolvedValue({
      id: deletedStoredAccount.stripeAccountId,
      object: 'account',
      deleted: true,
    })
    const recoveredReplacement = stripeAccount('acct_recovered_replacement', {
      userId: 'mentor-user-id',
      discunoConnectGeneration: replacementGeneration,
    })
    mocks.listAccounts.mockReturnValue([recoveredReplacement])

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({ stripeAccountId: recoveredReplacement.id })
    )
  })

  it('reconciles a false local deletion marker instead of creating another account', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    const liveProviderAccount = stripeAccount(deletedStoredAccount.stripeAccountId)
    mocks.retrieveAccount.mockResolvedValue(liveProviderAccount)

    await expect(createStripeConnectAccount()).resolves.toEqual({ success: true })

    expect(mocks.listAccounts).not.toHaveBeenCalled()
    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.upsertMentorStripeAccount).toHaveBeenCalledWith(
      expect.objectContaining({ stripeAccountId: deletedStoredAccount.stripeAccountId })
    )
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
    expect(mocks.requireFreshAuth).toHaveBeenCalledOnce()
    expect(mocks.getMentorStripeAccount).toHaveBeenCalledOnce()
    expect(mocks.createAccountLink).toHaveBeenCalledWith({
      account: ownerAccount.stripeAccountId,
      refresh_url: 'https://discuno.test/settings/event-types?stripe_refresh=true',
      return_url: 'https://discuno.test/settings/event-types?stripe_setup=success',
      type: 'account_update',
      collection_options: { fields: 'currently_due' },
    })
  })

  it('creates an onboarding link only for the replacement of a confirmed deleted account', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    mocks.retrieveAccount.mockRejectedValue(stripeResourceMissingError())
    mocks.createAccount.mockResolvedValue(stripeAccount('acct_replacement_for_link'))

    await expect(createStripeAccountLink()).resolves.toEqual({
      success: true,
      url: 'https://connect.stripe.test/account-link',
    })

    expect(mocks.createAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ account: 'acct_replacement_for_link' })
    )
    expect(mocks.createAccountLink).not.toHaveBeenCalledWith(
      expect.objectContaining({ account: deletedStoredAccount.stripeAccountId })
    )
  })

  it('returns an actionable safe error and never links when deleted-account replacement fails', async () => {
    mocks.getMentorStripeAccount.mockResolvedValue(deletedStoredAccount)
    mocks.retrieveAccount.mockResolvedValue({
      id: deletedStoredAccount.stripeAccountId,
      object: 'account',
      deleted: true,
    })
    mocks.createAccount.mockRejectedValue(
      new Error('private Stripe failure for mentor@example.edu')
    )

    await expect(createStripeAccountLink()).resolves.toEqual({
      success: false,
      error:
        'We could not restart payout setup. Please try again, or contact support if the problem continues.',
    })

    expect(mocks.createAccountLink).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private Stripe failure for mentor@example.edu'
    )
  })

  it('ignores a forged positional argument and creates a dashboard link for the stored account', async () => {
    const invokeWithForgedAccountId = createStripeLoginLink as unknown as (
      accountId: string
    ) => ReturnType<typeof createStripeLoginLink>

    const result = await invokeWithForgedAccountId('acct_owned_by_another_mentor')

    expect(result).toEqual({ success: true, url: 'https://connect.stripe.test/login-link' })
    expect(mocks.requireFreshAuth).toHaveBeenCalledOnce()
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

  it('stops before the protected account query when session freshness fails', async () => {
    mocks.requireFreshAuth.mockRejectedValueOnce(new SessionNotFreshError())

    await expect(createStripeAccountLink()).resolves.toEqual({
      success: false,
      error: 'Please sign in again to continue.',
      code: 'SESSION_NOT_FRESH',
      reauthUrl: '/auth?intent=mentor&reauth=1&returnTo=%2Fsettings%2Fevent-types',
    })

    expect(mocks.getMentorStripeAccount).not.toHaveBeenCalled()
    expect(mocks.createAccountLink).not.toHaveBeenCalled()
  })
})
