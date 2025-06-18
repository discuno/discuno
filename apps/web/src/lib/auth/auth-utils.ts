import type { Session, User } from 'next-auth'
import { cache } from 'react'
import { auth } from '~/server/auth'

export type AuthenticatedUser = User & {
  id: string
}

export class AppError extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}
export class UnauthenticatedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 'UNAUTHENTICATED', 401)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 'UNAUTHORIZED', 403)
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500)
  }
}

export class ExternalApiError extends AppError {
  constructor(message = 'Unkown external API error') {
    super(message, 'EXTERNAL_API_ERROR', 502)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 'BAD_REQUEST', 400)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404)
  }
}

/**
 * Require authentication for a page
 * Use this in Server Components that require authentication
 */
export const requireAuth = cache(async (): Promise<AuthenticatedUser> => {
  const session: Session | null = await auth()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!session?.user?.id) {
    throw new UnauthenticatedError()
  }

  return {
    ...session.user,
    id: session.user.id,
  }
})
