import { and, eq, lt, notExists } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '~/server/db'
import { session, user, verification } from '~/server/db/schema/index'

export const GET = async (req: NextRequest) => {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const expiredSessions = await db
    .delete(session)
    .where(lt(session.expiresAt, now))
    .returning({ id: session.id })
  const expiredVerifications = await db
    .delete(verification)
    .where(lt(verification.expiresAt, now))
    .returning({ id: verification.id })

  // Anonymous browsing identities are disposable. Retain them for 90 days,
  // then remove only users with no remaining session; dependent rows use the
  // schema's cascade/set-null policies.
  const anonymousCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const expiredAnonymousUsers = await db
    .delete(user)
    .where(
      and(
        eq(user.isAnonymous, true),
        lt(user.createdAt, anonymousCutoff),
        notExists(db.select({ id: session.id }).from(session).where(eq(session.userId, user.id)))
      )
    )
    .returning({ id: user.id })

  return NextResponse.json({
    message: 'Cleanup complete',
    expiredSessions: expiredSessions.length,
    expiredVerifications: expiredVerifications.length,
    expiredAnonymousUsers: expiredAnonymousUsers.length,
  })
}
