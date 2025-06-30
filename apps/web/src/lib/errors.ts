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
    this.name = 'UnauthenticatedError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 'UNAUTHORIZED', 403)
    this.name = 'UnauthorizedError'
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500)
    this.name = 'InternalServerError'
  }
}

export class ExternalApiError extends AppError {
  constructor(message = 'Unknown external API error') {
    super(message, 'EXTERNAL_API_ERROR', 502)
    this.name = 'ExternalApiError'
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 'BAD_REQUEST', 400)
    this.name = 'BadRequestError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}
