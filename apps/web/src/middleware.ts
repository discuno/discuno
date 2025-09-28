import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const anonymousId = request.cookies.get('anonymous_id')?.value
  const response = NextResponse.next()

  if (!anonymousId) {
    const newAnonymousId = crypto.randomUUID()
    response.cookies.set('anonymous_id', newAnonymousId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
