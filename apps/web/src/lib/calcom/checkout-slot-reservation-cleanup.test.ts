import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  deleteReturning: vi.fn(),
  deleteWhere: vi.fn(),
  from: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  select: vi.fn(),
  selectWhere: vi.fn(),
  retrieveSession: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  updateReturning: vi.fn(),
  updateWhere: vi.fn(),
}))

vi.mock('~/lib/stripe', () => ({
  stripe: { checkout: { sessions: { retrieve: mocks.retrieveSession } } },
}))

vi.mock('~/server/db', () => ({
  db: {
    delete: mocks.delete,
    select: mocks.select,
    update: mocks.update,
  },
}))

import {
  purgeTerminalCheckoutSlotReservations,
  releaseExpiredCheckoutSlotReservations,
} from '~/server/dal/checkout-slot-reservations'

describe('checkout slot reservation cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.limit.mockResolvedValue([])
    mocks.orderBy.mockReturnValue({ limit: mocks.limit })
    mocks.selectWhere.mockReturnValue({ orderBy: mocks.orderBy })
    mocks.from.mockReturnValue({ where: mocks.selectWhere })
    mocks.select.mockReturnValue({ from: mocks.from })
    mocks.retrieveSession.mockResolvedValue({ status: 'expired' })

    mocks.updateReturning.mockResolvedValue([])
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning })
    mocks.set.mockReturnValue({ where: mocks.updateWhere })
    mocks.update.mockReturnValue({ set: mocks.set })

    mocks.deleteReturning.mockResolvedValue([])
    mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning })
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere })
  })

  it('releases one bounded, idempotent batch and clears the mentor deletion guard', async () => {
    const now = new Date('2026-07-15T12:00:00.000Z')
    mocks.limit.mockResolvedValueOnce([
      { id: 'attempt-1', mentorUserId: 'mentor-1', stripeCheckoutSessionId: null },
      { id: 'attempt-2', mentorUserId: 'mentor-2', stripeCheckoutSessionId: null },
    ])
    mocks.updateReturning.mockResolvedValueOnce([{ id: 'attempt-1' }, { id: 'attempt-2' }])

    await expect(releaseExpiredCheckoutSlotReservations({ now, batchSize: 2 })).resolves.toBe(2)

    expect(mocks.limit).toHaveBeenCalledWith(2)
    expect(mocks.set).toHaveBeenCalledWith({
      mentorUserId: null,
      releasedAt: now,
      updatedAt: now,
    })
    expect(mocks.updateWhere).toHaveBeenCalledOnce()
  })

  it('retains a locally expired reservation when Stripe says Checkout completed', async () => {
    mocks.limit.mockResolvedValueOnce([
      {
        id: 'attempt-complete',
        mentorUserId: 'mentor-1',
        stripeCheckoutSessionId: 'cs_complete',
      },
    ])
    mocks.selectWhere.mockReturnValueOnce({ orderBy: mocks.orderBy }).mockResolvedValueOnce([])
    mocks.retrieveSession.mockResolvedValueOnce({ status: 'complete' })

    await expect(releaseExpiredCheckoutSlotReservations()).resolves.toBe(0)

    expect(mocks.retrieveSession).toHaveBeenCalledWith('cs_complete')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('releases a Stripe-expired reservation with no durable payment binding', async () => {
    mocks.limit.mockResolvedValueOnce([
      {
        id: 'attempt-expired',
        mentorUserId: 'mentor-1',
        stripeCheckoutSessionId: 'cs_expired',
      },
    ])
    mocks.selectWhere.mockReturnValueOnce({ orderBy: mocks.orderBy }).mockResolvedValueOnce([])
    mocks.retrieveSession.mockResolvedValueOnce({ status: 'expired' })
    mocks.updateReturning.mockResolvedValueOnce([{ id: 'attempt-expired' }])

    await expect(releaseExpiredCheckoutSlotReservations()).resolves.toBe(1)

    expect(mocks.retrieveSession).toHaveBeenCalledWith('cs_expired')
    expect(mocks.update).toHaveBeenCalledOnce()
  })

  it('lets an exact payment FK take over the mentor deletion guard', async () => {
    mocks.limit.mockResolvedValueOnce([
      {
        id: 'attempt-paid',
        mentorUserId: 'mentor-1',
        stripeCheckoutSessionId: 'cs_paid',
      },
    ])
    mocks.selectWhere
      .mockReturnValueOnce({ orderBy: mocks.orderBy })
      .mockResolvedValueOnce([{ stripeCheckoutSessionId: 'cs_paid', mentorUserId: 'mentor-1' }])
    mocks.updateReturning.mockResolvedValueOnce([{ id: 'attempt-paid' }])

    await expect(releaseExpiredCheckoutSlotReservations()).resolves.toBe(1)

    expect(mocks.retrieveSession).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledOnce()
  })

  it('does not issue a write when there are no expired active rows', async () => {
    await expect(releaseExpiredCheckoutSlotReservations()).resolves.toBe(0)
    expect(mocks.limit).toHaveBeenCalledWith(250)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('purges only one bounded terminal audit batch', async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 'attempt-3' }])
    mocks.deleteReturning.mockResolvedValueOnce([{ id: 'attempt-3' }])

    await expect(purgeTerminalCheckoutSlotReservations({ batchSize: 1 })).resolves.toBe(1)

    expect(mocks.limit).toHaveBeenCalledWith(1)
    expect(mocks.deleteWhere).toHaveBeenCalledOnce()
  })

  it.each([0, 1_001, 1.5])('rejects an unsafe batch size (%s)', async batchSize => {
    await expect(releaseExpiredCheckoutSlotReservations({ batchSize })).rejects.toThrow(RangeError)
    await expect(purgeTerminalCheckoutSlotReservations({ batchSize })).rejects.toThrow(RangeError)
    expect(mocks.select).not.toHaveBeenCalled()
  })
})
