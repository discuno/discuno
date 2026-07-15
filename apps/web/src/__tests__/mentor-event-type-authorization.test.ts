import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getEventTypesByUserId: vi.fn(),
  getStripeAccountByUserId: vi.fn(),
  requirePermission: vi.fn(),
  updateEventType: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requirePermission: mocks.requirePermission,
}))

vi.mock('~/server/dal/event-types', () => ({
  getEnabledEventTypesWithStripeStatus: vi.fn(),
  getEventTypesByUserId: mocks.getEventTypesByUserId,
  updateEventType: mocks.updateEventType,
}))

vi.mock('~/server/dal/stripe', () => ({
  getStripeAccountByUserId: mocks.getStripeAccountByUserId,
}))

import { updateMentorEventType } from '~/server/queries/event-types'

describe('mentor event-type update authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
