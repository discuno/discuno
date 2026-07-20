import { z } from 'zod'
import { getAuthSession } from '~/lib/auth/auth-utils'
import {
  getUserAnalyticsPreference,
  updateUserAnalyticsPreference,
} from '~/server/dal/analytics-preferences'

const analyticsPreferenceSchema = z.object({
  analyticsEnabled: z.boolean(),
})

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const response = Response.json(body, init)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

/**
 * Return the durable preference when a permanent or temporary session exists.
 * `null` deliberately tells the client to retain browser-only behavior.
 */
export async function GET() {
  const authSession = await getAuthSession()
  if (!authSession) return jsonResponse({ analyticsEnabled: null })

  const preference = await getUserAnalyticsPreference(authSession.user.id)
  return jsonResponse({ analyticsEnabled: preference })
}

export async function PATCH(request: Request) {
  const authSession = await getAuthSession()
  if (!authSession) {
    return jsonResponse({ error: 'Authentication required' }, { status: 401 })
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const parsedBody = analyticsPreferenceSchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Invalid analytics preference' }, { status: 400 })
  }

  const preference = await updateUserAnalyticsPreference(
    authSession.user.id,
    parsedBody.data.analyticsEnabled
  )

  if (preference === null) {
    return jsonResponse({ error: 'User not found' }, { status: 404 })
  }

  return jsonResponse({ analyticsEnabled: preference })
}
