import type { BetterAuthOptions } from 'better-auth'
import { redis } from '~/lib/redis'

type RateLimitStorage = NonNullable<NonNullable<BetterAuthOptions['rateLimit']>['customStorage']>

type RedisLike = {
  eval: <TArgs extends unknown[], TResult = unknown>(
    script: string,
    keys: string[],
    args: TArgs
  ) => Promise<TResult>
  get: <TData = unknown>(key: string) => Promise<TData | null>
  set: (key: string, value: unknown, options?: { ex: number }) => Promise<unknown>
}

const RATE_LIMIT_PREFIX = 'better-auth:rate-limit:'
const LEGACY_FALLBACK_TTL_SECONDS = 60

// Fixed-window counter: increment and attach the TTL atomically so parallel
// serverless requests cannot all pass the same stale read.
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { count, ttl }
`

const counterKey = (key: string): string => `${RATE_LIMIT_PREFIX}counter:${key}`
const fallbackKey = (key: string): string => `${RATE_LIMIT_PREFIX}fallback:${key}`

export const createBetterAuthRateLimitStorage = (client: RedisLike = redis): RateLimitStorage => ({
  // Better Auth 1.6 uses consume() when available. get/set remain implemented
  // for API compatibility and use a separate keyspace from atomic counters.
  get: async key => client.get(fallbackKey(key)),
  set: async (key, value) => {
    await client.set(fallbackKey(key), value, { ex: LEGACY_FALLBACK_TTL_SECONDS })
  },
  consume: async (key, rule) => {
    const window = Math.max(1, Math.ceil(rule.window))
    const result = await client.eval<[number], [number, number]>(
      CONSUME_SCRIPT,
      [counterKey(key)],
      [window]
    )
    const [count, ttl] = result

    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error('Invalid Redis rate-limit response')
    }

    const allowed = count <= rule.max
    return {
      allowed,
      retryAfter: allowed ? null : Math.max(1, ttl),
    }
  },
})

export const betterAuthRateLimitStorage = createBetterAuthRateLimitStorage()
