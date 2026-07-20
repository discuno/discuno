import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const connection = Object.assign(vi.fn().mockResolvedValue([]), { release: vi.fn() })
  return {
    connection,
    reserve: vi.fn().mockResolvedValue(connection),
  }
})

vi.mock('postgres', () => ({
  default: vi.fn(() => ({ reserve: mocks.reserve })),
}))

vi.mock('~/env', () => ({ env: { DATABASE_URL: 'postgres://test' } }))

import { withDatabaseAdvisoryLock } from './advisory-lock'

describe('withDatabaseAdvisoryLock', () => {
  beforeEach(() => {
    mocks.connection.mockClear()
    mocks.connection.release.mockClear()
    mocks.reserve.mockClear()
  })

  it('reuses one reserved PostgreSQL session for nested domain locks', async () => {
    await expect(
      withDatabaseAdvisoryLock('outer-payment', () =>
        withDatabaseAdvisoryLock('inner-cal-token', async () => 'done')
      )
    ).resolves.toBe('done')

    expect(mocks.reserve).toHaveBeenCalledTimes(1)
    expect(mocks.connection).toHaveBeenCalledTimes(4)
    expect(mocks.connection.release).toHaveBeenCalledTimes(1)
  })

  it('releases the nested locks and connection when the operation fails', async () => {
    await expect(
      withDatabaseAdvisoryLock('outer-payment', () =>
        withDatabaseAdvisoryLock('inner-cal-token', async () => {
          throw new Error('failed')
        })
      )
    ).rejects.toThrow('failed')

    expect(mocks.reserve).toHaveBeenCalledTimes(1)
    expect(mocks.connection).toHaveBeenCalledTimes(4)
    expect(mocks.connection.release).toHaveBeenCalledTimes(1)
  })
})
