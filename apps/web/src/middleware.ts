import { NextResponse } from 'next/server'
import { auth } from '~/server/auth'

export default auth(req => {
  const path = req.nextUrl.pathname

  // Now you can access auth data via req.auth instead of a token

  // ⬅️ redirect any authenticated requests at /auth straight to /
  if (path === '/auth' && req.auth) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Define public paths that don't require authentication
  const isPublicPath =
    path === '/auth' ||
    path === '/mentor' ||
    path.startsWith('/auth/') ||
    path.startsWith('/api/auth/') ||
    path === '/pricing'

  // Redirect logic
  if (!isPublicPath && !req.auth) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Continue with the request
  return NextResponse.next()
})

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Exclude _next, images, logos, favicon, api/auth, and .well-known
    '/((?!_next/static|_next/image|favicon.ico|images|logos|\\.well-known|api/auth).*)',
  ],
}
