import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ eval: vi.fn(), set: vi.fn() }))

vi.mock('~/env', () => ({ env: { CRON_SECRET: 'cron-secret' } }))
vi.mock('~/lib/redis', () => ({ redis: { eval: mocks.eval, set: mocks.set } }))

import { isAuthorizedCronRequest, runExclusiveCron } from '~/lib/cron'

describe('cron protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.eval.mockResolvedValue(1)
  })

  it('requires an exact bearer secret', () => {
    expect(
      isAuthorizedCronRequest(
        new Request('https://discuno.test/api/cron/test', {
          headers: { authorization: 'Bearer cron-secret' },
        })
      )
    ).toBe(true)
    expect(
      isAuthorizedCronRequest(
        new Request('https://discuno.test/api/cron/test', {
          headers: { authorization: 'Bearer wrong' },
        })
      )
    ).toBe(false)
  })

  it('acknowledges a duplicate delivery without running the task', async () => {
    mocks.set.mockResolvedValue(null)
    const task = vi.fn()

    await expect(runExclusiveCron({ name: 'ranking', task })).resolves.toEqual({
      status: 'already_running',
    })
    expect(task).not.toHaveBeenCalled()
    expect(mocks.eval).not.toHaveBeenCalled()
  })

  it('releases only its own lock after success', async () => {
    mocks.set.mockResolvedValue('OK')
    const task = vi.fn().mockResolvedValue(42)

    await expect(runExclusiveCron({ name: 'ranking', task })).resolves.toEqual({
      status: 'completed',
      value: 42,
    })
    expect(mocks.set).toHaveBeenCalledWith('discuno:cron-lock:ranking', expect.any(String), {
      ex: 600,
      nx: true,
    })
    expect(mocks.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get"'),
      ['discuno:cron-lock:ranking'],
      [expect.any(String)]
    )
  })

  it('releases its lock when the task fails', async () => {
    mocks.set.mockResolvedValue('OK')
    const task = vi.fn().mockRejectedValue(new Error('failed'))

    await expect(runExclusiveCron({ name: 'ranking', task })).rejects.toThrow('failed')
    expect(mocks.eval).toHaveBeenCalledOnce()
  })
})
