import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  returning: vi.fn(),
  select: vi.fn(),
  selectWhere: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  updateWhere: vi.fn(),
}))

vi.mock('~/server/db', () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}))

import { LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT } from '~/lib/calcom/booking-audit'
import { scrubLegacyBookingWebhookPayloads } from '~/server/dal/booking-audit'

describe('legacy Cal.com booking payload cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.limit.mockResolvedValue([])
    mocks.orderBy.mockReturnValue({ limit: mocks.limit })
    mocks.selectWhere.mockReturnValue({ orderBy: mocks.orderBy })
    mocks.from.mockReturnValue({ where: mocks.selectWhere })
    mocks.select.mockReturnValue({ from: mocks.from })

    mocks.returning.mockResolvedValue([])
    mocks.updateWhere.mockReturnValue({ returning: mocks.returning })
    mocks.set.mockReturnValue({ where: mocks.updateWhere })
    mocks.update.mockReturnValue({ set: mocks.set })
  })

  it('does nothing when every booking already has a privacy-minimal audit snapshot', async () => {
    await expect(scrubLegacyBookingWebhookPayloads()).resolves.toBe(0)

    expect(mocks.limit).toHaveBeenCalledWith(250)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('replaces one bounded legacy batch with the non-PII marker', async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 4 }, { id: 9 }])
    mocks.returning.mockResolvedValueOnce([{ id: 4 }, { id: 9 }])

    await expect(scrubLegacyBookingWebhookPayloads(2)).resolves.toBe(2)

    expect(mocks.limit).toHaveBeenCalledWith(2)
    expect(mocks.set).toHaveBeenCalledWith({
      webhookPayload: LEGACY_SCRUBBED_BOOKING_AUDIT_SNAPSHOT,
    })
    expect(JSON.stringify(mocks.set.mock.calls)).not.toContain('private.student@example.com')
  })

  it.each([0, 1_001, 1.5])('rejects an unsafe batch size (%s)', async batchSize => {
    await expect(scrubLegacyBookingWebhookPayloads(batchSize)).rejects.toThrow(RangeError)
    expect(mocks.select).not.toHaveBeenCalled()
  })
})
