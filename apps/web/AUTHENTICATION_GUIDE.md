# NextAuth.js v5 Authentication Guide

## Overview

This guide explains the new authentication setup that resolves the middleware database access issues you were experiencing. The previous setup was trying to access the database from middleware, which runs on the Edge Runtime and has database connection limitations.

## What Changed

### 1. Middleware Changes

**Before**: Using `auth()` function from NextAuth in middleware (caused database access issues)
**After**: Lightweight token-based route protection without database queries

```typescript
// OLD - Would fail with database errors
export default auth(req => {
  // This required database access
  if (!req.auth) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }
})

// NEW - Simple token check
export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('next-auth.session-token')
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }
}
```

### 2. Authentication Utilities

New utility functions in `~/lib/auth/auth-utils.ts`:

- `requireAuth()` - Redirects to `/auth` if not authenticated
- `redirectIfAuthenticated()` - Redirects authenticated users away from auth pages
- `getCurrentSession()` - Get session in Server Components
- `requireUserId()` - Get user ID, throw error if not found
- `isAuthenticated()` - Boolean check for authentication

## How to Use

### Protected Pages (Server Components)

```typescript
// Dashboard or any protected page
import { requireAuth } from '~/lib/auth/auth-utils'

const DashboardPage = async () => {
  // This will redirect to /auth if not authenticated
  const session = await requireAuth()

  return (
    <div>
      <h1>Welcome, {session.user?.name}!</h1>
      {/* Your protected content */}
    </div>
  )
}
```

### Auth Pages (Redirect if Already Logged In)

```typescript
// Login/Register pages
import { redirectIfAuthenticated } from '~/lib/auth/auth-utils'

const AuthPage = async () => {
  // Redirect to dashboard if already logged in
  await redirectIfAuthenticated('/')

  return (
    <div>
      {/* Login/register form */}
    </div>
  )
}
```

### Server Actions

```typescript
// In your server actions
import { requireUserId } from '~/lib/auth/auth-utils'

export async function createPost(formData: FormData) {
  const userId = await requireUserId()

  // Your action logic with guaranteed user ID
  const post = await db.insert(posts).values({
    userId,
    title: formData.get('title'),
    // ...
  })
}
```

### Conditional Rendering

```typescript
// When you need to check auth status
import { isAuthenticated } from '~/lib/auth/auth-utils'

const NavBar = async () => {
  const isLoggedIn = await isAuthenticated()

  return (
    <nav>
      {isLoggedIn ? (
        <UserMenu />
      ) : (
        <LoginButton />
      )}
    </nav>
  )
}
```

## Route Protection Strategy

### Middleware Level (Fast, No DB Access)

- Checks for session token existence
- Redirects to `/auth` if no token
- Handles basic route protection

### Page Level (Full Auth Check)

- Uses `requireAuth()` in Server Components
- Validates session with database
- Handles user data access

## Benefits of This Approach

1. **No Database Access in Middleware**: Eliminates edge runtime limitations
2. **Faster Route Protection**: Simple cookie checks vs database queries
3. **Proper Session Validation**: Full auth checks happen in Server Components where needed
4. **Better Error Handling**: Clear separation of concerns
5. **Edge Runtime Compatible**: Works with Vercel Edge Functions

## Migration Checklist

- [x] Updated middleware to use lightweight token checks
- [x] Created auth utility functions
- [x] Updated auth page to redirect authenticated users
- [x] Your existing dashboard page already uses `requireAuth()`

## Common Patterns

### 1. Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
import { requireAuth } from '~/lib/auth/auth-utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div>
      <NavBar />
      {children}
    </div>
  )
}
```

### 2. API Routes

```typescript
// app/api/posts/route.ts
import { requireAuth } from '~/lib/auth/auth-utils'

export async function POST(request: Request) {
  const session = await requireAuth()

  // Your API logic
}
```

### 3. Conditional Page Content

```typescript
const PublicPage = async () => {
  const session = await getCurrentSession()

  return (
    <div>
      <h1>Welcome to our platform</h1>
      {session ? (
        <UserWelcome user={session.user} />
      ) : (
        <SignUpCTA />
      )}
    </div>
  )
}
```

## Troubleshooting

### If you see "redirect called in middleware"

- Make sure you're not calling `redirect()` in middleware
- Use `NextResponse.redirect()` instead

### If authentication isn't working

- Check that your database tables exist (`pnpm db:test:local`)
- Verify your `NEXTAUTH_SECRET` environment variable
- Check that your OAuth providers are configured correctly

### If you need session in client components

- Use the `useSession` hook from NextAuth
- Make sure to wrap your app with `SessionProvider`

## Security Notes

- Session tokens are checked in middleware for performance
- Full session validation happens in Server Components
- Database access is properly handled in the correct runtime context
- OAuth callbacks are excluded from middleware protection
