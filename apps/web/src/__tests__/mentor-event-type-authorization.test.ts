import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: { PAYMENTS_ENABLED: false },
  getEnabledEventTypesWithStripeStatus: vi.fn(),
  getEventTypesByUserId: vi.fn(),
  getStripeAccountByUserId: vi.fn(),
  requirePermission: vi.fn(),
  updateEventType: vi.fn(),
}))

vi.mock('~/env', () => ({ env: mocks.env }))

vi.mock('~/lib/auth/auth-utils', () => ({
  requirePermission: mocks.requirePermission,
}))

vi.mock('~/server/dal/event-types', () => ({
  getEnabledEventTypesWithStripeStatus: mocks.getEnabledEventTypesWithStripeStatus,
  getEventTypesByUserId: mocks.getEventTypesByUserId,
  updateEventType: mocks.updateEventType,
}))

vi.mock('~/server/dal/stripe', () => ({
  getStripeAccountByUserId: mocks.getStripeAccountByUserId,
}))

import {
  getMentorEnabledEventTypesWithStripeStatus,
  updateMentorEventType,
} from '~/server/queries/event-types'

describe('mentor event-type update authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.PAYMENTS_ENABLED = false
  })

  it("cannot update another mentor's event type", async () => {
    const authenticatedMentorId = '11111111-1111-4111-8111-111111111111'
    const otherMentorEventTypeId = 9876
    mocks.requirePermission.mockResolvedValue({ user: { id: authenticatedMentorId } })
    // The ownership-scoped read intentionally does not expose another mentor's row.
    mocks.getEventTypesByUserId.mockResolvedValue([])

    await expect(
      updateMentorEventType(otherMentorEventTypeId, {
        customPrice: 500,
        currency: 'USD',
        isEnabled: true,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })

    expect(mocks.requirePermission).toHaveBeenCalledWith({ mentor: ['manage'] })
    expect(mocks.getEventTypesByUserId).toHaveBeenCalledWith(authenticatedMentorId)
    expect(mocks.updateEventType).not.toHaveBeenCalled()
  })

  it('rejects enabling a paid session type while paid bookings are paused', async () => {
    const mentorId = '22222222-2222-4222-8222-222222222222'
    mocks.requirePermission.mockResolvedValue({ user: { id: mentorId } })
    mocks.getEventTypesByUserId.mockResolvedValue([
      {
        calcomEventTypeId: 42,
        customPrice: 2500,
        isEnabled: false,
        bookingCompatible: true,
      },
    ])

    await expect(updateMentorEventType(42, { isEnabled: true })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      statusCode: 400,
      message:
        'Paid sessions are not available yet. Keep this session type paused or set it to free.',
    })

    expect(mocks.getStripeAccountByUserId).not.toHaveBeenCalled()
    expect(mocks.updateEventType).not.toHaveBeenCalled()
  })

  it('still allows a mentor to configure pricing while the paid type remains paused', async () => {
    const mentorId = '33333333-3333-4333-8333-333333333333'
    mocks.requirePermission.mockResolvedValue({ user: { id: mentorId } })
    mocks.getEventTypesByUserId.mockResolvedValue([
      {
        calcomEventTypeId: 43,
        customPrice: 0,
        isEnabled: false,
        bookingCompatible: true,
      },
    ])

    await expect(updateMentorEventType(43, { customPrice: 2500 })).resolves.toBeUndefined()

    expect(mocks.getStripeAccountByUserId).not.toHaveBeenCalled()
    expect(mocks.updateEventType).toHaveBeenCalledWith(43, mentorId, { customPrice: 2500 })
  })
})

describe('public mentor event-type payment gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.PAYMENTS_ENABLED = false
  })

  it('exposes only free session types while paid bookings are paused', async () => {
    mocks.getEnabledEventTypesWithStripeStatus.mockResolvedValue([
      {
        calcomEventTypeId: 101,
        title: 'Free question',
        description: null,
        duration: 20,
        customPrice: 0,
        currency: 'USD',
        transfersEnabled: null,
        payoutsEnabled: null,
        stripeAccountStatus: null,
      },
      {
        calcomEventTypeId: 102,
        title: 'Paid deep dive',
        description: null,
        duration: 45,
        customPrice: 3500,
        currency: 'USD',
        transfersEnabled: true,
        payoutsEnabled: true,
        stripeAccountStatus: 'active',
      },
    ])

    await expect(
      getMentorEnabledEventTypesWithStripeStatus('mentor-payment-switch-off')
    ).resolves.toEqual([
      {
        calcomEventTypeId: 101,
        title: 'Free question',
        description: null,
        duration: 20,
        customPrice: 0,
        currency: 'USD',
      },
    ])
  })

  it('exposes a paid type only when launch and payout readiness are both active', async () => {
    mocks.env.PAYMENTS_ENABLED = true
    mocks.getEnabledEventTypesWithStripeStatus.mockResolvedValue([
      {
        calcomEventTypeId: 201,
        title: 'Ready paid session',
        description: null,
        duration: 30,
        customPrice: 2000,
        currency: 'USD',
        transfersEnabled: true,
        payoutsEnabled: true,
        stripeAccountStatus: 'active',
      },
      {
        calcomEventTypeId: 202,
        title: 'Unready paid session',
        description: null,
        duration: 30,
        customPrice: 2000,
        currency: 'USD',
        transfersEnabled: false,
        payoutsEnabled: true,
        stripeAccountStatus: 'restricted',
      },
    ])

    await expect(
      getMentorEnabledEventTypesWithStripeStatus('mentor-payment-switch-on')
    ).resolves.toEqual([expect.objectContaining({ calcomEventTypeId: 201, customPrice: 2000 })])
  })
})
