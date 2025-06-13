import { db } from '~/server/db'
import { sessions, verificationTokens } from '~/server/db/schema'
import { lt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const GET = async (req: NextRequest) => {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()
  await db.delete(sessions).where(lt(sessions.expires, now))
  await db.delete(verificationTokens).where(lt(verificationTokens.expires, now))

  return NextResponse.json({ message: 'Cleanup complete' })
}
