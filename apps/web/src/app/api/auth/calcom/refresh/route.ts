import { type NextRequest, NextResponse } from 'next/server'
import { refreshCalcomToken } from '~/app/(default)/availability/actions'

/**
 * Cal.com refresh token endpoint
 * Handles token refresh for Cal.com atoms integration
 */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.substring(7) // Remove "Bearer " prefix

    const res = await refreshCalcomToken(accessToken)

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
