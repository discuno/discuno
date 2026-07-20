import { describe, expect, it, vi } from 'vitest'

vi.mock('~/lib/redis', () => ({ redis: {} }))

import { createBetterAuthRateLimitStorage } from './rate-limit-storage'

type RedisClient = NonNullable<Parameters<typeof createBetterAuthRateLimitStorage>[0]>

const createRedis = (result: [number, number]) => {
  const evalMock = vi.fn().mockResolvedValue(result)
  const client = {
    eval: evalMock,
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  } as unknown as RedisClient

  return { client, evalMock }
}

describe('Better Auth Redis rate-limit storage', () => {
  it('allows requests within the atomic fixed window', async () => {
    const { client, evalMock } = createRedis([3, 45])
    const storage = createBetterAuthRateLimitStorage(client)

    await expect(storage.consume?.('client:/sign-in', { window: 60, max: 3 })).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    })
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR'"),
      ['better-auth:rate-limit:counter:client:/sign-in'],
      [60]
    )
  })

  it('returns the Redis TTL after the limit is exceeded', async () => {
    const { client } = createRedis([4, 37])
    const storage = createBetterAuthRateLimitStorage(client)

    await expect(storage.consume?.('client:/sign-in', { window: 60, max: 3 })).resolves.toEqual({
      allowed: false,
      retryAfter: 37,
    })
  })

  it('fails closed on malformed Redis responses', async () => {
    const { client } = createRedis([Number.NaN, 10])
    const storage = createBetterAuthRateLimitStorage(client)

    await expect(storage.consume?.('client:/sign-in', { window: 60, max: 3 })).rejects.toThrow(
      'Invalid Redis rate-limit response'
    )
  })
})
