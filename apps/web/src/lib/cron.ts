import 'server-only'

import { randomUUID, timingSafeEqual } from 'node:crypto'
import { env } from '~/env'
import { redis } from '~/lib/redis'

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`

export const isAuthorizedCronRequest = (request: Request): boolean => {
  const actual = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${env.CRON_SECRET}`
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

type CronRunResult<T> =
  { status: 'completed'; value: T } | { status: 'already_running'; value?: never }

/**
 * Prevent duplicate Vercel cron deliveries from running the same job concurrently.
 * The lease outlives the default Vercel Function duration, and is released with a
 * compare-and-delete script so an expired lease can never delete a newer owner's lock.
 */
export const runExclusiveCron = async <T>({
  name,
  task,
  leaseSeconds = 10 * 60,
}: {
  name: string
  task: () => Promise<T>
  leaseSeconds?: number
}): Promise<CronRunResult<T>> => {
  const lockKey = `discuno:cron-lock:${name}`
  const lockOwner = randomUUID()
  const acquired = await redis.set(lockKey, lockOwner, { ex: leaseSeconds, nx: true })

  if (acquired !== 'OK') return { status: 'already_running' }

  try {
    return { status: 'completed', value: await task() }
  } finally {
    await redis.eval(RELEASE_LOCK_SCRIPT, [lockKey], [lockOwner])
  }
}
