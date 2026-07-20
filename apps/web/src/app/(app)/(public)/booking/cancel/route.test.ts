import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  expireSession: vi.fn(),
  findReservation: vi.fn(),
  releaseCheckoutSlotReservation: vi.fn(),
  requireAuth: vi.fn(),
  resolveCanonicalUserId: vi.fn(),
  retrieveSession: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('~/lib/services/checkout-slot-reservation', () => ({
  getCheckoutAttemptLockKey: (attemptId: string) => `discuno:checkout-attempt:${attemptId}`,
  releaseCheckoutSlotReservation: mocks.releaseCheckoutSlotReservation,
}))
vi.mock('~/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: { retrieve: mocks.retrieveSession, expire: mocks.expireSession },
    },
  },
}))
vi.mock('~/server/db', () => ({
  db: {
    query: { checkoutSlotReservation: { findFirst: mocks.findReservation } },
  },
}))
vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: (_key: string, operation: () => Promise<unknown>) => operation(),
}))
vi.mock('~/server/dal/user-identities', () => ({
  resolveCanonicalUserId: mocks.resolveCanonicalUserId,
}))

import { GET } from '~/app/(app)/(public)/booking/cancel/route'

const bookingAttemptId = '33333333-3333-4333-8333-333333333333'

describe('hosted Checkout cancellation return', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' },
    })
    mocks.resolveCanonicalUserId.mockImplementation(async id => id)
    mocks.findReservation.mockResolvedValue({
      bookingAttemptId,
      actorUserId: '11111111-1111-4111-8111-111111111111',
      mentorUserId: '22222222-2222-4222-8222-222222222222',
      stripeCheckoutSessionId: 'cs_test_open',
      calcomReservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    })
    mocks.retrieveSession.mockResolvedValue({ id: 'cs_test_open', status: 'open' })
    mocks.expireSession.mockResolvedValue({ id: 'cs_test_open', status: 'expired' })
    mocks.releaseCheckoutSlotReservation.mockResolvedValue(undefined)
  })

  it('expires Stripe before releasing Cal.com and returns to the mentor', async () => {
    const response = await GET(
      new Request(
        `https://discuno.com/booking/cancel?attempt=${bookingAttemptId}&generation=1&returnTo=%2Fmentor%2Ftest-mentor`
      )
    )

    expect(mocks.expireSession).toHaveBeenCalledWith('cs_test_open')
    expect(mocks.releaseCheckoutSlotReservation).toHaveBeenCalledWith({
      bookingAttemptId,
      reservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
      mentorUserId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.headers.get('location')).toBe(
      'https://discuno.com/mentor/test-mentor?checkout=cancelled'
    )
  })

  it('does not release the hold when Stripe cannot be expired safely', async () => {
    mocks.expireSession.mockRejectedValue(new Error('temporary Stripe failure'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(
      new Request(`https://discuno.com/booking/cancel?attempt=${bookingAttemptId}&generation=1`)
    )

    expect(mocks.releaseCheckoutSlotReservation).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://discuno.com/?checkout=cancel_error')
  })

  it('returns a completed Checkout through the opaque booking attempt', async () => {
    mocks.retrieveSession.mockResolvedValueOnce({ id: 'cs_test_complete', status: 'complete' })

    const response = await GET(
      new Request(`https://discuno.com/booking/cancel?attempt=${bookingAttemptId}&generation=1`)
    )

    expect(mocks.expireSession).not.toHaveBeenCalled()
    expect(mocks.releaseCheckoutSlotReservation).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      `https://discuno.com/booking/success?attempt=${bookingAttemptId}`
    )
    expect(response.headers.get('location')).not.toContain('cs_test_complete')
  })

  it('retains the hold when Stripe returns an unknown nullable status', async () => {
    mocks.retrieveSession.mockResolvedValueOnce({ id: 'cs_test_open', status: null })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(
      new Request(`https://discuno.com/booking/cancel?attempt=${bookingAttemptId}&generation=1`)
    )

    expect(mocks.expireSession).not.toHaveBeenCalled()
    expect(mocks.releaseCheckoutSlotReservation).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://discuno.com/?checkout=cancel_error')
  })

  it('does not let a stale cancel URL release a newer reservation generation', async () => {
    mocks.findReservation.mockResolvedValue({
      bookingAttemptId,
      actorUserId: '11111111-1111-4111-8111-111111111111',
      mentorUserId: '22222222-2222-4222-8222-222222222222',
      stripeCheckoutSessionId: null,
      calcomReservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
      generation: 2,
      releasedAt: null,
      consumedAt: null,
    })

    const response = await GET(
      new Request(`https://discuno.com/booking/cancel?attempt=${bookingAttemptId}&generation=1`)
    )

    expect(mocks.retrieveSession).not.toHaveBeenCalled()
    expect(mocks.releaseCheckoutSlotReservation).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://discuno.com/?checkout=cancelled')
  })
})
