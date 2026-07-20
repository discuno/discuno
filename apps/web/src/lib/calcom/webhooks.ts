import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { env } from '~/env'
import { calcomRequest } from '~/lib/calcom/client'
import { CalcomWebhookResponseSchema } from '~/lib/calcom/schemas'
import { decryptCalcomToken, encryptCalcomToken } from '~/lib/calcom/token-crypto'
import { getCalcomAccessToken } from '~/lib/calcom/tokens'
import { getCalcomApiUrl, getCalcomRequestSignal } from '~/lib/calcom/transport'
import { listAllCalcomWebhooks } from '~/lib/calcom/webhook-list'
import { ExternalApiError } from '~/lib/errors'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import { calcomToken, calcomWebhookCleanup } from '~/server/db/schema'

const CALCOM_WEBHOOK_VERSION = '2021-10-20'
const CALCOM_WEBHOOK_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_REJECTED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_NO_SHOW_UPDATED',
  'MEETING_STARTED',
  'MEETING_ENDED',
  'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
  'AFTER_GUESTS_CAL_VIDEO_NO_SHOW',
] as const

const getSubscriberBaseUrl = () =>
  env.CALCOM_WEBHOOK_URL ?? new URL('/api/webhooks/cal', env.NEXT_PUBLIC_BASE_URL).toString()

const getSubscriberUrl = (routeKey: string) => {
  const url = new URL(getSubscriberBaseUrl())
  url.searchParams.set('connection', routeKey)
  return url.toString()
}

export const hashCalcomWebhookRouteKey = (routeKey: string) =>
  createHash('sha256').update(routeKey).digest('hex')

const isDiscunoSubscriberUrl = (value: string) => {
  try {
    const candidate = new URL(value)
    const base = new URL(getSubscriberBaseUrl())
    return candidate.origin === base.origin && candidate.pathname === base.pathname
  } catch {
    return false
  }
}

const webhookPayload = (routeKey: string, secret: string) => ({
  active: true,
  subscriberUrl: getSubscriberUrl(routeKey),
  triggers: CALCOM_WEBHOOK_TRIGGERS,
  secret,
  version: CALCOM_WEBHOOK_VERSION,
})

/** Ensure each connected Cal.com account has exactly one Discuno booking webhook. */
export const ensureCalcomWebhook = async (userId: string): Promise<string> => {
  const expectedConnection = await db.query.calcomToken.findFirst({
    where: and(
      eq(calcomToken.userId, userId),
      eq(calcomToken.authMode, 'oauth'),
      isNull(calcomToken.disconnectedAt)
    ),
    columns: { id: true, calcomUserId: true, connectedAt: true },
  })
  if (!expectedConnection) throw new ExternalApiError('Cal.com account is not connected')

  // Resolve/refresh before taking the connection lock. Every provider request
  // inside the lock uses this token directly and therefore cannot reserve a
  // nested token-lock connection.
  const accessToken = await getCalcomAccessToken(userId)
  return withDatabaseAdvisoryLock(`discuno:calcom-connection:${userId}`, async () => {
    const [connection] = await db
      .select({
        id: calcomToken.id,
        calcomUserId: calcomToken.calcomUserId,
        connectedAt: calcomToken.connectedAt,
        webhookId: calcomToken.webhookId,
        accessToken: calcomToken.accessToken,
        refreshToken: calcomToken.refreshToken,
        accessTokenExpiresAt: calcomToken.accessTokenExpiresAt,
        webhookSecret: calcomToken.webhookSecret,
        webhookRouteKey: calcomToken.webhookRouteKey,
        webhookRouteKeyHash: calcomToken.webhookRouteKeyHash,
      })
      .from(calcomToken)
      .where(
        and(
          eq(calcomToken.userId, userId),
          eq(calcomToken.authMode, 'oauth'),
          isNull(calcomToken.disconnectedAt)
        )
      )
      .limit(1)
    if (!connection?.accessToken || !connection.refreshToken) {
      throw new ExternalApiError('Cal.com account is not connected')
    }
    if (
      connection.id !== expectedConnection.id ||
      connection.calcomUserId !== expectedConnection.calcomUserId ||
      connection.connectedAt?.getTime() !== expectedConnection.connectedAt?.getTime()
    ) {
      throw new ExternalApiError('Cal.com connection changed before webhook provisioning')
    }

    let routeKey: string
    let secret: string
    let routeKeyHash: string
    if (connection.webhookSecret && connection.webhookRouteKey && connection.webhookRouteKeyHash) {
      routeKey = decryptCalcomToken(connection.webhookRouteKey, userId)
      secret = decryptCalcomToken(connection.webhookSecret, userId)
      routeKeyHash = hashCalcomWebhookRouteKey(routeKey)
      if (routeKeyHash !== connection.webhookRouteKeyHash) {
        throw new ExternalApiError('Cal.com webhook identity is inconsistent')
      }
      // Decryption can use the previous rotation key, while encryption always
      // uses the primary key. Rewriting here makes the periodic webhook audit a
      // bounded online migration for these long-lived credentials.
      const [rotatedIdentity] = await db
        .update(calcomToken)
        .set({
          webhookSecret: encryptCalcomToken(secret, userId),
          webhookRouteKey: encryptCalcomToken(routeKey, userId),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(calcomToken.userId, userId),
            eq(calcomToken.calcomUserId, connection.calcomUserId),
            eq(calcomToken.webhookRouteKeyHash, routeKeyHash),
            eq(calcomToken.authMode, 'oauth'),
            isNull(calcomToken.disconnectedAt)
          )
        )
        .returning({ id: calcomToken.id })
      if (!rotatedIdentity) {
        throw new ExternalApiError('Cal.com connection changed while rotating webhook identity')
      }
    } else {
      routeKey = randomBytes(32).toString('base64url')
      secret = randomBytes(32).toString('base64url')
      routeKeyHash = hashCalcomWebhookRouteKey(routeKey)
      const [storedIdentity] = await db
        .update(calcomToken)
        .set({
          webhookSecret: encryptCalcomToken(secret, userId),
          webhookRouteKey: encryptCalcomToken(routeKey, userId),
          webhookRouteKeyHash: routeKeyHash,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(calcomToken.userId, userId),
            eq(calcomToken.calcomUserId, connection.calcomUserId),
            eq(calcomToken.authMode, 'oauth'),
            isNull(calcomToken.disconnectedAt)
          )
        )
        .returning({ id: calcomToken.id })
      if (!storedIdentity) {
        throw new ExternalApiError('Cal.com connection changed while creating webhook identity')
      }
    }

    const allWebhooks = await listAllCalcomWebhooks(accessToken)
    const matchingWebhooks = allWebhooks.filter(
      webhook => webhook.subscriberUrl === getSubscriberUrl(routeKey)
    )
    const existing =
      allWebhooks.find(webhook => webhook.id === connection.webhookId) ?? matchingWebhooks[0]

    const response = existing
      ? await calcomRequest<unknown>(`/webhooks/${existing.id}`, {
          method: 'PATCH',
          accessToken,
          body: JSON.stringify(webhookPayload(routeKey, secret)),
        })
      : await calcomRequest<unknown>('/webhooks', {
          method: 'POST',
          accessToken,
          body: JSON.stringify(webhookPayload(routeKey, secret)),
        })

    const webhook = CalcomWebhookResponseSchema.parse(response).data
    for (const duplicate of allWebhooks.filter(item =>
      isDiscunoSubscriberUrl(item.subscriberUrl)
    )) {
      if (duplicate.id === webhook.id) continue
      await calcomRequest<unknown>(`/webhooks/${duplicate.id}`, {
        method: 'DELETE',
        accessToken,
      })
    }

    const [updated] = await db
      .update(calcomToken)
      .set({ webhookId: webhook.id, updatedAt: new Date() })
      .where(
        and(
          eq(calcomToken.userId, userId),
          eq(calcomToken.calcomUserId, connection.calcomUserId),
          eq(calcomToken.webhookRouteKeyHash, routeKeyHash),
          eq(calcomToken.authMode, 'oauth'),
          isNull(calcomToken.disconnectedAt)
        )
      )
      .returning({ id: calcomToken.id })
    if (!updated) {
      // The remote mutation won a race with disconnect/account replacement.
      // Preserve the old identity's encrypted credentials so recovery can
      // remove the now-stale provider webhook instead of orphaning it.
      await db
        .insert(calcomWebhookCleanup)
        .values({
          userId,
          calcomUserId: connection.calcomUserId,
          webhookId: webhook.id,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          accessTokenExpiresAt: connection.accessTokenExpiresAt,
        })
        .onConflictDoNothing({ target: calcomWebhookCleanup.webhookId })
      throw new ExternalApiError('Cal.com connection changed while provisioning its webhook')
    }
    return webhook.id
  })
}

export const deleteCalcomWebhook = async (userId: string, webhookId: string | null) => {
  if (!webhookId) return
  await calcomRequest<unknown>(`/webhooks/${webhookId}`, {
    method: 'DELETE',
    userId,
  })
}

export type CalcomWebhookDeletionResult = 'deleted' | 'unauthorized' | 'forbidden'

/**
 * Delete a webhook with credentials copied into the cleanup outbox. This avoids
 * consulting the user's current connection, which may already point at another
 * Cal.com account by the time the worker runs.
 */
export const deleteCalcomWebhookWithAccessToken = async (
  webhookId: string,
  accessToken: string
): Promise<CalcomWebhookDeletionResult> => {
  const response = await fetch(getCalcomApiUrl(`/webhooks/${webhookId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: getCalcomRequestSignal(),
  })

  if (response.ok || response.status === 404) return 'deleted'
  if (response.status === 401) return 'unauthorized'
  if (response.status === 403) return 'forbidden'

  console.error('Cal.com webhook cleanup request failed', { status: response.status })
  throw new ExternalApiError('Cal.com webhook cleanup is temporarily unavailable')
}
