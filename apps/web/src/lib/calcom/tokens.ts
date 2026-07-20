import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { ExternalApiError } from '~/lib/errors'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import { calcomToken, calcomWebhookCleanup, mentorEventType } from '~/server/db/schema/index'
import { decryptCalcomToken, encryptCalcomToken } from './token-crypto'
import {
  CalcomOAuthTokenError,
  hasRequiredCalcomOAuthScopes,
  refreshCalcomOAuthTokens,
} from './oauth'

const REFRESH_SKEW_MS = 2 * 60 * 1000

const isUsable = (expiresAt: Date | null) =>
  Boolean(expiresAt && expiresAt.getTime() > Date.now() + REFRESH_SKEW_MS)

type OAuthCredentialRow = {
  authMode: string
  disconnectedAt: Date | null
  accessToken: string | null
  refreshToken: string | null
}

type ConnectedOAuthCredentialRow = {
  authMode: 'oauth'
  disconnectedAt: null
  accessToken: string
  refreshToken: string
}

function assertOAuthCredentials<Row extends OAuthCredentialRow>(
  row: Row
): asserts row is Row & ConnectedOAuthCredentialRow {
  if (row.authMode !== 'oauth' || row.disconnectedAt || !row.accessToken || !row.refreshToken) {
    throw new ExternalApiError('Cal.com account must be connected again')
  }
}

export const getCalcomAccessToken = async (
  userId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<string> => {
  const initial = await db.query.calcomToken.findFirst({
    where: eq(calcomToken.userId, userId),
  })
  if (!initial) throw new ExternalApiError('Cal.com account is not connected')
  assertOAuthCredentials(initial)

  if (!options.forceRefresh && isUsable(initial.accessTokenExpiresAt)) {
    return decryptCalcomToken(initial.accessToken, userId)
  }

  const result = await withDatabaseAdvisoryLock(`discuno:calcom-token:${userId}`, async () => {
    const current = await db.query.calcomToken.findFirst({
      where: eq(calcomToken.userId, userId),
    })
    if (!current) throw new ExternalApiError('Cal.com account is not connected')
    assertOAuthCredentials(current)

    const credentialsChangedWhileWaiting =
      current.accessToken !== initial.accessToken || current.refreshToken !== initial.refreshToken
    if (
      isUsable(current.accessTokenExpiresAt) &&
      (!options.forceRefresh || credentialsChangedWhileWaiting)
    ) {
      return {
        status: 'active' as const,
        accessToken: decryptCalcomToken(current.accessToken, userId),
      }
    }

    const currentCredentialConditions = and(
      eq(calcomToken.userId, userId),
      eq(calcomToken.authMode, 'oauth'),
      isNull(calcomToken.disconnectedAt),
      eq(calcomToken.calcomUserId, current.calcomUserId),
      eq(calcomToken.accessToken, current.accessToken),
      eq(calcomToken.refreshToken, current.refreshToken)
    )

    const markConnectionForReconnect = async (): Promise<boolean> => {
      const now = new Date()
      return db.transaction(async tx => {
        const [disconnected] = await tx
          .update(calcomToken)
          .set({
            accessToken: null,
            refreshToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            tokenType: null,
            scopes: null,
            webhookId: null,
            webhookSecret: null,
            webhookRouteKey: null,
            webhookRouteKeyHash: null,
            disconnectedAt: now,
            updatedAt: now,
          })
          .where(currentCredentialConditions)
          .returning({ id: calcomToken.id })
        if (!disconnected) return false

        if (current.webhookId !== null) {
          // Preserve a durable cleanup trail only after the credential CAS wins;
          // a concurrent reconnect must not inherit cleanup for its live webhook.
          await tx
            .insert(calcomWebhookCleanup)
            .values({
              userId,
              calcomUserId: current.calcomUserId,
              webhookId: current.webhookId,
              accessToken: current.accessToken,
              refreshToken: current.refreshToken,
              accessTokenExpiresAt: current.accessTokenExpiresAt,
            })
            .onConflictDoNothing({ target: calcomWebhookCleanup.webhookId })
        }
        await tx
          .update(mentorEventType)
          .set({ isEnabled: false, updatedAt: now })
          .where(eq(mentorEventType.mentorUserId, userId))
        return true
      })
    }

    let refreshed
    try {
      refreshed = await refreshCalcomOAuthTokens(decryptCalcomToken(current.refreshToken, userId))
    } catch (error) {
      if (error instanceof CalcomOAuthTokenError && error.oauthErrorCode === 'invalid_grant') {
        const disconnected = await markConnectionForReconnect()
        return { status: disconnected ? ('reconnect' as const) : ('superseded' as const) }
      }
      throw error
    }

    if (!hasRequiredCalcomOAuthScopes(refreshed.scope)) {
      const disconnected = await markConnectionForReconnect()
      return { status: disconnected ? ('reconnect' as const) : ('superseded' as const) }
    }
    const accessTokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

    const [updated] = await db
      .update(calcomToken)
      .set({
        accessToken: encryptCalcomToken(refreshed.access_token, userId),
        refreshToken: encryptCalcomToken(refreshed.refresh_token, userId),
        accessTokenExpiresAt,
        tokenType: refreshed.token_type,
        scopes: refreshed.scope,
        lastRefreshAt: new Date(),
        updatedAt: new Date(),
      })
      .where(currentCredentialConditions)
      .returning({ id: calcomToken.id })

    if (!updated) return { status: 'superseded' as const }

    return { status: 'active' as const, accessToken: refreshed.access_token }
  })

  if (result.status === 'reconnect') {
    throw new ExternalApiError('Cal.com account must be connected again')
  }
  if (result.status === 'superseded') {
    // A reconnect or disconnect won the race while the provider token endpoint
    // was in flight. Re-read the new identity instead of writing stale tokens.
    return getCalcomAccessToken(userId)
  }
  if (!result.accessToken) throw new ExternalApiError('Cal.com account must be connected again')
  return result.accessToken
}
