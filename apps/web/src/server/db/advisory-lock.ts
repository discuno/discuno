import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'
import postgres from 'postgres'
import { env } from '~/env'

// Advisory locks use a separate, deliberately tiny pool. Locked operations can
// continue using the primary Drizzle pool without each reserving one of its five
// connections and deadlocking under concurrent load.
const lockClient = postgres(env.DATABASE_URL, {
  max: 2,
  idle_timeout: 5,
  connect_timeout: 10,
  max_lifetime: 30 * 60,
})

type LockConnection = Awaited<ReturnType<typeof lockClient.reserve>>

// Nested domain operations (for example payment -> Cal token refresh) must use
// the already-reserved PostgreSQL session. Reserving another tiny-pool
// connection while the outer operation holds one can deadlock under ordinary
// concurrency. PostgreSQL session advisory locks safely support multiple keys
// and balanced nested acquisition on one connection.
const advisoryLockContext = new AsyncLocalStorage<LockConnection>()

const runWithAdvisoryLock = async <T>(
  connection: LockConnection,
  key: string,
  operation: () => Promise<T>
): Promise<T> => {
  let acquired = false
  try {
    await connection`select pg_advisory_lock(hashtextextended(${key}, 0))`
    acquired = true
    return await operation()
  } finally {
    if (acquired) {
      try {
        await connection`select pg_advisory_unlock(hashtextextended(${key}, 0))`
      } catch (error) {
        console.error('Failed to release database advisory lock', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      }
    }
  }
}

export const withDatabaseAdvisoryLock = async <T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> => {
  const existingConnection = advisoryLockContext.getStore()
  if (existingConnection) {
    return runWithAdvisoryLock(existingConnection, key, operation)
  }

  const connection = await lockClient.reserve()
  try {
    return await advisoryLockContext.run(connection, () =>
      runWithAdvisoryLock(connection, key, operation)
    )
  } finally {
    connection.release()
  }
}
