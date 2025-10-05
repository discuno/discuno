import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '~/lib/redis'

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
})
