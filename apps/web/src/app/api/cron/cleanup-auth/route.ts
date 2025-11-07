import { lt } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '~/server/db'
import { session, verification } from '~/server/db/schema/index'

export const GET = async (req: NextRequest) => {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()
  await db.delete(session).where(lt(session.expiresAt, now))
  await db.delete(verification).where(lt(verification.expiresAt, now))

  return NextResponse.json({ message: 'Cleanup complete' })
}
