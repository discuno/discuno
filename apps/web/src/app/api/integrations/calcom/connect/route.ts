import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { requireFreshPermission } from '~/lib/auth/auth-utils'
import {
  buildMentorSignInPath,
  buildReauthenticationPath,
  resolveCalcomOAuthReturnTo,
} from '~/lib/auth/config'
import { buildCalcomAuthorizationUrl, CALCOM_OAUTH_COOKIE } from '~/lib/calcom/oauth'
import { SessionNotFreshError, UnauthenticatedError, UnauthorizedError } from '~/lib/errors'

export async function GET(request: NextRequest) {
  const returnTo = resolveCalcomOAuthReturnTo(request.nextUrl.searchParams.get('returnTo'))
  let user: Awaited<ReturnType<typeof requireFreshPermission>>['user']

  try {
    const authResult = await requireFreshPermission({ mentor: ['manage'] })
    user = authResult.user
  } catch (error) {
    const resumeSearch = new URLSearchParams({ returnTo })
    const resumePath = `/api/integrations/calcom/connect?${resumeSearch.toString()}`
    if (error instanceof UnauthenticatedError) {
      return NextResponse.redirect(new URL(buildMentorSignInPath(resumePath), request.url))
    }
    if (error instanceof SessionNotFreshError) {
      return NextResponse.redirect(new URL(buildReauthenticationPath(resumePath), request.url))
    }
    if (error instanceof UnauthorizedError) {
      return NextResponse.redirect(new URL('/for-mentors?school-email-required=1', request.url))
    }
    throw error
  }

  const state = randomBytes(32).toString('base64url')
  const cookieStore = await cookies()

  cookieStore.set(
    CALCOM_OAUTH_COOKIE,
    Buffer.from(JSON.stringify({ state, userId: user.id, returnTo }), 'utf8').toString('base64url'),
    {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/api/integrations/calcom',
      maxAge: 10 * 60,
    }
  )

  return NextResponse.redirect(buildCalcomAuthorizationUrl(state))
}
