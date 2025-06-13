# Discuno Web App API Documentation

This document provides comprehensive information about the Discuno Web App's API endpoints and server actions.

## Table of Contents

- [Authentication](#authentication)
- [API Routes](#api-routes)
- [Server Actions](#server-actions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Overview

Discuno uses NextAuth.js v5 for authentication with support for multiple providers.

### Supported Providers

- **Google OAuth** - Primary authentication method
- **GitHub OAuth** - Alternative authentication method
- **Magic Links** - Email-based passwordless authentication

### Session Management

```typescript
// Get session in Server Component
import { auth } from '~/server/auth'

const session = await auth()
if (!session) {
  // User not authenticated
}
```

```typescript
// Get session in Client Component
import { useSession } from 'next-auth/react'

const { data: session, status } = useSession()
```

### Route Protection

```typescript
// Middleware-based protection
export { auth as middleware } from '~/server/auth'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## API Routes

### Authentication Routes

#### `POST /api/auth/signin`

Sign in with OAuth provider or magic link.

#### `POST /api/auth/signout`

Sign out the current user.

#### `GET /api/auth/session`

Get current session information.

### Cal.com Integration

#### `GET /api/cal/availability`

Get mentor availability from Cal.com.

**Parameters:**

- `userId` (string) - Cal.com user ID
- `dateFrom` (string) - Start date (ISO format)
- `dateTo` (string) - End date (ISO format)

**Response:**

```json
{
  "busy": [
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### `POST /api/cal/bookings`

Create a new booking through Cal.com.

**Body:**

```json
{
  "eventTypeId": 123,
  "start": "2024-01-15T14:00:00Z",
  "attendee": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Stripe Integration

#### `POST /api/stripe/create-checkout-session`

Create a Stripe Checkout session for payments.

**Body:**

```json
{
  "priceId": "price_123",
  "quantity": 1,
  "mentorId": "user_123"
}
```

#### `POST /api/stripe/webhook`

Handle Stripe webhook events.

**Headers:**

- `stripe-signature` - Webhook signature for verification

---

## Server Actions

### User Management

#### `createUser(data: CreateUserData)`

Create a new user profile.

```typescript
import { createUser } from '~/server/actions/users'

const result = await createUser({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'STUDENT',
})
```

#### `updateUserProfile(userId: string, data: UpdateUserData)`

Update user profile information.

### Booking Management

#### `createBooking(data: CreateBookingData)`

Create a new booking with Cal.com integration.

```typescript
import { createBooking } from '~/server/actions/bookings'

const booking = await createBooking({
  mentorId: 'mentor_123',
  studentId: 'student_456',
  eventTypeId: 789,
  startTime: new Date('2024-01-15T14:00:00Z'),
  duration: 60,
})
```

#### `cancelBooking(bookingId: string)`

Cancel an existing booking.

### Payment Actions

#### `processPayment(data: PaymentData)`

Process payment through Stripe.

```typescript
import { processPayment } from '~/server/actions/payments'

const payment = await processPayment({
  amount: 5000, // $50.00 in cents
  currency: 'usd',
  mentorId: 'mentor_123',
  bookingId: 'booking_456',
})
```

---

## Error Handling

### API Error Format

All API errors follow this structure:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "code": "INVALID_FORMAT"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User lacks required permissions
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Requested resource not found
- `RATE_LIMITED` - Too many requests
- `EXTERNAL_API_ERROR` - Cal.com or Stripe API error

### Server Action Errors

Server actions return standardized error objects:

```typescript
type ActionResult<T> = {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}
```

---

## Rate Limiting

### Default Limits

- **API Routes**: 100 requests per 15 minutes per IP
- **Server Actions**: 50 requests per 10 minutes per user
- **Auth Endpoints**: 10 requests per 5 minutes per IP

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705317000
```

### Bypassing Rate Limits

Authenticated admin users have higher rate limits:

- **API Routes**: 1000 requests per 15 minutes
- **Server Actions**: 500 requests per 10 minutes

---

## Webhooks

### Cal.com Webhooks

#### `POST /api/webhooks/cal`

Handle Cal.com booking events.

**Events:**

- `booking.created`
- `booking.cancelled`
- `booking.rescheduled`

### Stripe Webhooks

#### `POST /api/webhooks/stripe`

Handle Stripe payment events.

**Events:**

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

## Development

### Testing API Endpoints

```bash
# Test authentication
curl -X GET http://localhost:3000/api/auth/session \
  -H "Cookie: next-auth.session-token=..."

# Test with httpie
http GET localhost:3000/api/cal/availability userId==123 dateFrom=="2024-01-15" dateTo=="2024-01-16"
```

### Environment Variables

See [Environment Setup](./ENVIRONMENT.md) for required environment variables.

---

## Security

### CORS Configuration

API routes are configured with appropriate CORS headers for production use.

### Request Validation

All API endpoints use Zod schemas for request validation:

```typescript
import { z } from 'zod'

const createBookingSchema = z.object({
  mentorId: z.string().uuid(),
  startTime: z.string().datetime(),
  duration: z.number().min(15).max(180),
})
```

### Authentication Middleware

Protected routes automatically verify JWT tokens and user permissions.

---

For more information, see:

- [Database Schema](./DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Environment Setup](./ENVIRONMENT.md)
