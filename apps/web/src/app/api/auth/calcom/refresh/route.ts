import { NextResponse } from 'next/server'
import { refreshCalcomToken } from '~/app/(default)/(dashboard)/scheduling/actions'

/**
 * Cal.com refresh token endpoint
 * Handles token refresh for Cal.com atoms integration
 */
export const GET = async (): Promise<NextResponse> => {
  try {
    // Refresh Cal.com token for authenticated user
    const res = await refreshCalcomToken()

    if (res.success) {
      return NextResponse.json({
        accessToken: res.accessToken,
      })
    } else {
      console.error('Refresh endpoint error:', res.error)
      return NextResponse.json({ error: res.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Refresh endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
