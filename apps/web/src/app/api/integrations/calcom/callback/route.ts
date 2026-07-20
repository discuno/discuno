import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { inngest } from '~/inngest/client'
import { requireFreshPermission } from '~/lib/auth/auth-utils'
import {
  buildMentorSignInPath,
  buildReauthenticationPath,
  resolveCalcomOAuthReturnTo,
} from '~/lib/auth/config'
import {
  exchangeCalcomAuthorizationCode,
  getCalcomOAuthProfile,
  hasRequiredCalcomOAuthScopes,
  CALCOM_OAUTH_COOKIE,
} from '~/lib/calcom/oauth'
import { encryptCalcomToken } from '~/lib/calcom/token-crypto'
import { ensureCalcomWebhook } from '~/lib/calcom/webhooks'
import { SessionNotFreshError, UnauthenticatedError, UnauthorizedError } from '~/lib/errors'
import { storeCalcomConnectionForUser } from '~/lib/services/calcom-tokens-service'
import { syncMentorEventTypesForUser } from '~/server/auth/dal'
import {
  CalcomConnectionHasProtectedBookingsError,
  markCalcomWebhookCleanupQueued,
} from '~/server/dal/calcom'

const OAuthCookieSchema = z.object({
  state: z.string().min(32),
  userId: z.uuid(),
  returnTo: z.string().refine(value => resolveCalcomOAuthReturnTo(value) === value),
})

const isEqualState = (received: string, expected: string) => {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

const redirectWithStatus = (request: NextRequest, returnTo: string, status: string) => {
  const redirectUrl = new URL(returnTo, request.url)
  redirectUrl.searchParams.set('calcom', status)
  return NextResponse.redirect(redirectUrl)
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const encodedCookie = cookieStore.get(CALCOM_OAUTH_COOKIE)?.value
  cookieStore.delete(CALCOM_OAUTH_COOKIE)

  let oauthCookie: z.infer<typeof OAuthCookieSchema> | null = null
  try {
    oauthCookie = encodedCookie
      ? OAuthCookieSchema.parse(
          JSON.parse(Buffer.from(encodedCookie, 'base64url').toString('utf8'))
        )
      : null
  } catch {
    oauthCookie = null
  }

  const returnTo = oauthCookie?.returnTo ?? '/settings'
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const oauthError = request.nextUrl.searchParams.get('error')

  if (!oauthCookie || !state || !isEqualState(state, oauthCookie.state) || oauthError || !code) {
    return redirectWithStatus(request, returnTo, oauthError ? 'denied' : 'invalid_state')
  }

  try {
    const { user } = await requireFreshPermission({ mentor: ['manage'] })
    if (user.id !== oauthCookie.userId) {
      return redirectWithStatus(request, returnTo, 'invalid_state')
    }

    const tokens = await exchangeCalcomAuthorizationCode(code)
    if (!hasRequiredCalcomOAuthScopes(tokens.scope)) {
      throw new Error('Cal.com did not grant every required OAuth scope')
    }
    const calcomProfile = await getCalcomOAuthProfile(tokens.access_token)
    const now = new Date()

    const { cleanupId } = await storeCalcomConnectionForUser({
      userId: user.id,
      calcomUserId: calcomProfile.id,
      calcomUsername: calcomProfile.username,
      authMode: 'oauth',
      accessToken: encryptCalcomToken(tokens.access_token, user.id),
      refreshToken: encryptCalcomToken(tokens.refresh_token, user.id),
      accessTokenExpiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
      refreshTokenExpiresAt: null,
      tokenType: tokens.token_type,
      scopes: tokens.scope,
      webhookId: null,
      connectedAt: now,
      disconnectedAt: null,
      lastRefreshAt: null,
    })

    try {
      if (cleanupId) {
        await inngest.send({
          id: `calcom-webhook-cleanup-${cleanupId}`,
          name: 'discuno/calcom.webhook-cleanup.requested',
          data: { cleanupId },
        })
        await markCalcomWebhookCleanupQueued(cleanupId)
      }
      await inngest.send({
        id: `calcom-connection-sync-${user.id}-${now.getTime()}`,
        name: 'discuno/calcom.connection-sync.requested',
        data: { userId: user.id },
      })
      return redirectWithStatus(request, returnTo, 'connected_syncing')
    } catch (enqueueError) {
      // Keep the first connection usable even during an Inngest incident. This
      // synchronous fallback is intentionally sequential so webhookId remains
      // the readiness marker only after event types have synchronized.
      const syncResult = await syncMentorEventTypesForUser(user.id)
      const eventTypesReady = syncResult.success
      let webhookReady = false
      if (eventTypesReady) {
        try {
          await ensureCalcomWebhook(user.id)
          webhookReady = true
        } catch {
          webhookReady = false
        }
      }

      if (!eventTypesReady || !webhookReady) {
        console.error('Cal.com post-authorization provisioning needs retry', {
          userId: user.id,
          queueAvailable: false,
          eventTypesReady,
          webhookReady,
          enqueueErrorName: enqueueError instanceof Error ? enqueueError.name : 'UnknownError',
        })
        return redirectWithStatus(request, returnTo, 'connected_needs_sync')
      }
    }

    return redirectWithStatus(request, returnTo, 'connected')
  } catch (error) {
    const resumeSearch = new URLSearchParams({ returnTo })
    const restartPath = `/api/integrations/calcom/connect?${resumeSearch.toString()}`
    if (error instanceof UnauthenticatedError) {
      return NextResponse.redirect(new URL(buildMentorSignInPath(restartPath), request.url))
    }
    if (error instanceof SessionNotFreshError) {
      return NextResponse.redirect(new URL(buildReauthenticationPath(restartPath), request.url))
    }
    if (error instanceof UnauthorizedError) {
      return NextResponse.redirect(new URL('/for-mentors?school-email-required=1', request.url))
    }
    if (error instanceof CalcomConnectionHasProtectedBookingsError) {
      return redirectWithStatus(request, returnTo, 'bookings_active')
    }
    console.error('Cal.com OAuth callback failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return redirectWithStatus(request, returnTo, 'error')
  }
}
