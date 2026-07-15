import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ calcomRequest: vi.fn() }))

vi.mock('~/lib/calcom/client', () => ({ calcomRequest: mocks.calcomRequest }))

import { listAllCalcomWebhooks } from '~/lib/calcom/webhook-list'

const webhook = (id: number) => ({
  id: `webhook-${id}`,
  subscriberUrl: `https://discuno.test/api/webhooks/cal?connection=${id}`,
  active: true,
})

const response = (data: ReturnType<typeof webhook>[]) => ({ status: 'success', data })

describe('Cal.com webhook list pagination', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests the documented take/skip contract on the first page', async () => {
    mocks.calcomRequest.mockResolvedValue(response([webhook(1)]))

    await expect(listAllCalcomWebhooks('access-token')).resolves.toEqual([webhook(1)])
    expect(mocks.calcomRequest).toHaveBeenCalledWith('/webhooks?take=250&skip=0', {
      accessToken: 'access-token',
    })
  })

  it('continues after a full page so duplicates beyond record 250 are visible', async () => {
    const firstPage = Array.from({ length: 250 }, (_, index) => webhook(index + 1))
    const secondPage = [webhook(251)]
    mocks.calcomRequest
      .mockResolvedValueOnce(response(firstPage))
      .mockResolvedValueOnce(response(secondPage))

    await expect(listAllCalcomWebhooks('access-token')).resolves.toEqual([
      ...firstPage,
      ...secondPage,
    ])
    expect(mocks.calcomRequest).toHaveBeenNthCalledWith(2, '/webhooks?take=250&skip=250', {
      accessToken: 'access-token',
    })
  })

  it('fails closed instead of provisioning from an unbounded partial list', async () => {
    const fullPage = Array.from({ length: 250 }, (_, index) => webhook(index + 1))
    mocks.calcomRequest.mockResolvedValue(response(fullPage))

    await expect(listAllCalcomWebhooks('access-token')).rejects.toThrow(
      'Cal.com webhook pagination exceeded its safe page limit'
    )
    expect(mocks.calcomRequest).toHaveBeenCalledTimes(100)
    expect(mocks.calcomRequest).toHaveBeenLastCalledWith('/webhooks?take=250&skip=24750', {
      accessToken: 'access-token',
    })
  })
})
