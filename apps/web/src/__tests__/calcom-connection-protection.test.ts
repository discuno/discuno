import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const execute = vi.fn()
  const insert = vi.fn()
  const leftJoin = vi.fn()
  const limit = vi.fn()
  const innerJoin = vi.fn(() => ({ leftJoin }))
  const selectWhere = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ innerJoin, where: selectWhere }))
  const select = vi.fn(() => ({ from }))
  const updateReturning = vi.fn()
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  const updateSet = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set: updateSet }))
  const transaction = vi.fn()
  const tx = { execute, insert, select, update }

  leftJoin.mockReturnValue({ where: selectWhere })

  return {
    execute,
    insert,
    limit,
    transaction,
    tx,
    update,
    updateReturning,
    withDatabaseAdvisoryLock: vi.fn(),
  }
})

vi.mock('~/lib/schemas/db', () => ({
  insertCalcomTokenSchema: { parse: (value: unknown) => value },
}))
vi.mock('~/server/db', () => ({
  db: { transaction: mocks.transaction },
}))
vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: mocks.withDatabaseAdvisoryLock,
}))

import {
  CalcomConnectionHasProtectedBookingsError,
  disconnectCalcomConnection,
  storeCalcomConnection,
} from '~/server/dal/calcom'

const MENTOR_USER_ID = '11111111-1111-4111-8111-111111111111'

describe('Cal.com connection booking protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.execute.mockResolvedValue(undefined)
    mocks.updateReturning.mockResolvedValue([])
    mocks.transaction.mockImplementation(
      async (operation: (tx: typeof mocks.tx) => Promise<unknown>) => operation(mocks.tx)
    )
    mocks.withDatabaseAdvisoryLock.mockImplementation(
      async (_key: string, operation: () => Promise<unknown>) => operation()
    )
  })

  it('rejects disconnect before provider cleanup or local disabling for a future active booking', async () => {
    mocks.limit
      .mockResolvedValueOnce([
        {
          userId: MENTOR_USER_ID,
          calcomUserId: 101,
          authMode: 'oauth',
          webhookId: '202',
        },
      ])
      .mockResolvedValueOnce([{ id: 303 }])

    await expect(disconnectCalcomConnection(MENTOR_USER_ID)).rejects.toBeInstanceOf(
      CalcomConnectionHasProtectedBookingsError
    )
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.withDatabaseAdvisoryLock).toHaveBeenCalledWith(
      `discuno:calcom-connection:${MENTOR_USER_ID}`,
      expect.any(Function)
    )
  })

  it('rejects switching Cal.com accounts while a paid booking remains unsettled', async () => {
    mocks.limit
      .mockResolvedValueOnce([
        {
          userId: MENTOR_USER_ID,
          calcomUserId: 101,
          authMode: 'oauth',
          webhookId: '202',
        },
      ])
      .mockResolvedValueOnce([{ id: 303 }])

    await expect(
      storeCalcomConnection({
        userId: MENTOR_USER_ID,
        calcomUserId: 404,
        calcomUsername: 'replacement-account',
        authMode: 'oauth',
        accessToken: 'encrypted-access-token',
        refreshToken: 'encrypted-refresh-token',
        accessTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
        refreshTokenExpiresAt: new Date('2099-02-01T00:00:00.000Z'),
        tokenType: 'Bearer',
        scopes: 'PROFILE_READ BOOKING_READ BOOKING_WRITE',
        webhookId: null,
        webhookSecret: null,
        webhookRouteKey: null,
        webhookRouteKeyHash: null,
        connectedAt: new Date('2026-07-15T00:00:00.000Z'),
        disconnectedAt: null,
        lastRefreshAt: null,
      })
    ).rejects.toBeInstanceOf(CalcomConnectionHasProtectedBookingsError)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('rejects disconnect while a pre-payment Checkout reservation is still active', async () => {
    mocks.limit
      .mockResolvedValueOnce([
        {
          userId: MENTOR_USER_ID,
          calcomUserId: 101,
          authMode: 'oauth',
          webhookId: '202',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: '33333333-3333-4333-8333-333333333333' }])

    await expect(disconnectCalcomConnection(MENTOR_USER_ID)).rejects.toBeInstanceOf(
      CalcomConnectionHasProtectedBookingsError
    )
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
