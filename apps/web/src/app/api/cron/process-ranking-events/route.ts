import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest, runExclusiveCron } from '~/lib/cron'
import { getSafeErrorName } from '~/lib/operational-logging'
import { processAnalyticsEvents } from '~/server/ranking/service'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await runExclusiveCron({
      name: 'process-ranking-events',
      task: processAnalyticsEvents,
    })
    if (result.status === 'already_running') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_running' })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ranking event processing failed', {
      errorName: getSafeErrorName(error),
    })
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
