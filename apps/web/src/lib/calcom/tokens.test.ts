import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const oauthScopes = [
    'PROFILE_READ',
    'EVENT_TYPE_READ',
    'BOOKING_READ',
    'BOOKING_WRITE',
    'SCHEDULE_READ',
    'SCHEDULE_WRITE',
    'WEBHOOK_READ',
    'WEBHOOK_WRITE',
  ] as const
  class MockCalcomOAuthTokenError extends Error {
    public readonly oauthErrorCode: string

    constructor(oauthErrorCode: string) {
      super('Cal.com authorization could not be completed')
      this.name = 'CalcomOAuthTokenError'
      this.oauthErrorCode = oauthErrorCode
    }
  }
  const findFirst = vi.fn()
  const execute = vi.fn()
  const limit = vi.fn()
  const selectWhere = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where: selectWhere }))
  const select = vi.fn(() => ({ from }))
  const updateWhere = vi.fn()
  const returning = vi.fn()
  const set = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set }))
  const transaction = vi.fn()
  const withDatabaseAdvisoryLock = vi.fn()

  return {
    CalcomOAuthTokenError: MockCalcomOAuthTokenError,
    decryptCalcomToken: vi.fn(),
    encryptCalcomToken: vi.fn(),
    execute,
    findFirst,
    from,
    limit,
    oauthScopes,
    refreshCalcomOAuthTokens: vi.fn(),
    returning,
    select,
    selectWhere,
    set,
    transaction,
    update,
    updateWhere,
    withDatabaseAdvisoryLock,
    tx: { execute, select, update },
  }
})

vi.mock('~/server/db', () => ({
  db: {
    query: { calcomToken: { findFirst: mocks.findFirst } },
    transaction: mocks.transaction,
    update: mocks.update,
  },
}))

vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: mocks.withDatabaseAdvisoryLock,
}))

vi.mock('~/lib/calcom/token-crypto', () => ({
  decryptCalcomToken: mocks.decryptCalcomToken,
  encryptCalcomToken: mocks.encryptCalcomToken,
}))

vi.mock('~/lib/calcom/oauth', () => ({
  CALCOM_OAUTH_SCOPES: mocks.oauthScopes,
  CalcomOAuthTokenError: mocks.CalcomOAuthTokenError,
  hasRequiredCalcomOAuthScopes: (scope: string) => {
    const granted = new Set(scope.split(/[\s,]+/).filter(Boolean))
    return mocks.oauthScopes.every(requiredScope => granted.has(requiredScope))
  },
  refreshCalcomOAuthTokens: mocks.refreshCalcomOAuthTokens,
}))

import { CALCOM_OAUTH_SCOPES, CalcomOAuthTokenError } from '~/lib/calcom/oauth'
import { getCalcomAccessToken } from '~/lib/calcom/tokens'

const expiredConnection = {
  authMode: 'oauth',
  disconnectedAt: null,
  accessToken: 'encrypted-old-access-token',
  refreshToken: 'encrypted-old-refresh-token',
  accessTokenExpiresAt: new Date(0),
  calcomUserId: 42,
  webhookId: null,
}

const refreshedTokens = {
  access_token: 'fresh-access-token',
  refresh_token: 'fresh-refresh-token',
  token_type: 'bearer',
  expires_in: 1_800,
  scope: CALCOM_OAUTH_SCOPES.join(' '),
}

describe('Cal.com OAuth token refresh lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirst.mockResolvedValue(expiredConnection)
    mocks.limit.mockResolvedValue([expiredConnection])
    mocks.execute.mockResolvedValue(undefined)
    mocks.updateWhere.mockReturnValue({ returning: mocks.returning })
    mocks.returning.mockResolvedValue([{ id: 1 }])
    mocks.transaction.mockImplementation(async callback => callback(mocks.tx))
    mocks.withDatabaseAdvisoryLock.mockImplementation(
      async (_key: string, operation: () => Promise<unknown>) => operation()
    )
    mocks.decryptCalcomToken.mockImplementation((encrypted: string) => {
      if (encrypted === 'encrypted-old-refresh-token') return 'old-refresh-token'
      return 'old-access-token'
    })
    mocks.encryptCalcomToken.mockImplementation((plaintext: string) => `encrypted:${plaintext}`)
    mocks.refreshCalcomOAuthTokens.mockResolvedValue(refreshedTokens)
  })

  it('stores a valid rotated token set and returns the fresh access token', async () => {
    await expect(getCalcomAccessToken('mentor-user-id')).resolves.toBe('fresh-access-token')

    expect(mocks.refreshCalcomOAuthTokens).toHaveBeenCalledWith('old-refresh-token')
    expect(mocks.set).toHaveBeenCalledOnce()
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'encrypted:fresh-access-token',
        refreshToken: 'encrypted:fresh-refresh-token',
        tokenType: 'bearer',
        scopes: CALCOM_OAUTH_SCOPES.join(' '),
      })
    )
  })

  it('commits a disconnected state before requiring reconnect for an invalid refresh grant', async () => {
    mocks.refreshCalcomOAuthTokens.mockRejectedValue(new CalcomOAuthTokenError('invalid_grant'))

    await expect(getCalcomAccessToken('mentor-user-id')).rejects.toThrow(
      'Cal.com account must be connected again'
    )

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.update).toHaveBeenCalledTimes(2)
    expect(mocks.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        tokenType: null,
        scopes: null,
        webhookId: null,
        disconnectedAt: expect.any(Date),
      })
    )
    expect(mocks.set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ isEnabled: false, updatedAt: expect.any(Date) })
    )
  })

  it('disconnects and disables event types when refreshed scopes are incomplete', async () => {
    mocks.refreshCalcomOAuthTokens.mockResolvedValue({
      ...refreshedTokens,
      scope: CALCOM_OAUTH_SCOPES.filter(scope => scope !== 'SCHEDULE_WRITE').join(' '),
    })

    await expect(getCalcomAccessToken('mentor-user-id')).rejects.toThrow(
      'Cal.com account must be connected again'
    )

    expect(mocks.set).toHaveBeenCalledTimes(2)
    expect(mocks.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        accessToken: null,
        refreshToken: null,
        webhookId: null,
        disconnectedAt: expect.any(Date),
      })
    )
    expect(mocks.set).toHaveBeenNthCalledWith(2, expect.objectContaining({ isEnabled: false }))
  })

  it('preserves the connection for a non-terminal OAuth client failure', async () => {
    const failure = new CalcomOAuthTokenError('invalid_client')
    mocks.refreshCalcomOAuthTokens.mockRejectedValue(failure)

    await expect(getCalcomAccessToken('mentor-user-id')).rejects.toBe(failure)

    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
  })
})
