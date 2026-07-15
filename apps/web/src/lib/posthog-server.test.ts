import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  PostHog: vi.fn(),
  capture: vi.fn(),
  getPreference: vi.fn(),
  identify: vi.fn(),
  resolveCanonicalUserId: vi.fn(),
  shutdown: vi.fn(),
}))

vi.mock('~/env', () => ({
  env: {
    NEXT_PUBLIC_POSTHOG_HOST: 'https://posthog.test',
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
  },
}))
vi.mock('~/server/dal/analytics-preferences', () => ({
  getUserAnalyticsPreference: mocks.getPreference,
}))
vi.mock('~/server/dal/user-identities', () => ({
  resolveCanonicalUserId: mocks.resolveCanonicalUserId,
}))
vi.mock('posthog-node', () => ({
  PostHog: class MockPostHog {
    capture = mocks.capture
    identify = mocks.identify
    shutdown = mocks.shutdown

    constructor(...args: unknown[]) {
      mocks.PostHog(...args)
    }
  },
}))

import { identifyUser, trackServerEvent } from './posthog-server'

const userId = '019f6109-49eb-7022-9bf8-aab013d40e18'

describe('server PostHog consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPreference.mockResolvedValue(null)
    mocks.resolveCanonicalUserId.mockImplementation(async (value: string) => value)
    mocks.shutdown.mockResolvedValue(undefined)
  })

  it('suppresses capture for an opted-out user without constructing a client', async () => {
    mocks.getPreference.mockResolvedValue(false)

    await trackServerEvent(userId, 'booking_created')

    expect(mocks.PostHog).not.toHaveBeenCalled()
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it('suppresses capture for a user with no explicit choice', async () => {
    await trackServerEvent(userId, 'booking_created', { bookingId: 1 })

    expect(mocks.PostHog).not.toHaveBeenCalled()
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it('captures for a user who explicitly opted in', async () => {
    mocks.getPreference.mockResolvedValue(true)

    await trackServerEvent(userId, 'booking_created', { bookingId: 1 })

    expect(mocks.capture).toHaveBeenCalledWith({
      distinctId: userId,
      event: 'booking_created',
      properties: { bookingId: 1 },
    })
    expect(mocks.shutdown).toHaveBeenCalledOnce()
  })

  it('suppresses identification for an opted-out user', async () => {
    mocks.getPreference.mockResolvedValue(false)

    await identifyUser(userId, { email: 'student@example.edu' })

    expect(mocks.identify).not.toHaveBeenCalled()
  })

  it('fails closed when the preference cannot be read', async () => {
    mocks.getPreference.mockRejectedValue(new Error('database unavailable'))

    await trackServerEvent(userId, 'booking_created')

    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it('does not query the user table for a non-user distinct ID', async () => {
    await trackServerEvent('system-reconciliation', 'payout_reconciled')

    expect(mocks.getPreference).not.toHaveBeenCalled()
    expect(mocks.resolveCanonicalUserId).not.toHaveBeenCalled()
    expect(mocks.capture).toHaveBeenCalledOnce()
  })

  it('uses a linked permanent identity and its opt-out preference', async () => {
    const linkedUserId = '22222222-2222-4222-8222-222222222222'
    mocks.resolveCanonicalUserId.mockResolvedValue(linkedUserId)
    mocks.getPreference.mockResolvedValue(false)

    await trackServerEvent(userId, 'booking_created')

    expect(mocks.getPreference).toHaveBeenCalledWith(linkedUserId)
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it('fails closed for a historical UUID with no canonical user', async () => {
    mocks.resolveCanonicalUserId.mockResolvedValue(null)

    await trackServerEvent(userId, 'booking_created')

    expect(mocks.getPreference).not.toHaveBeenCalled()
    expect(mocks.capture).not.toHaveBeenCalled()
  })
})
