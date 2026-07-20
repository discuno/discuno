import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest, runExclusiveCron } from '~/lib/cron'
import { getSafeErrorName } from '~/lib/operational-logging'
import { decayRankingScores } from '~/server/ranking/service'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await runExclusiveCron({
      name: 'decay-ranking-scores',
      task: decayRankingScores,
    })
    if (result.status === 'already_running') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_running' })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ranking score decay failed', {
      errorName: getSafeErrorName(error),
    })
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
