import { NotFoundError, UnauthenticatedError } from '~/lib/errors'

export const isExpectedProfileError = (
  error: unknown
): error is UnauthenticatedError | NotFoundError => {
  return error instanceof UnauthenticatedError || error instanceof NotFoundError
}
