import { NextResponse } from 'next/server'
import { decayRankingScores } from '~/server/ranking/service'

export async function GET() {
  try {
    await decayRankingScores()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error decaying ranking scores:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
