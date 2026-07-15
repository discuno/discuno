/**
 * Return a fixed, code-defined error category without serializing an error
 * message, stack, cause, mutable `name`, or mutable `constructor` property.
 */
export const getSafeErrorName = (error: unknown): string => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return 'DOMException'
  }
  if (!(error instanceof Error)) return 'UnknownError'

  if (error instanceof AggregateError) return 'AggregateError'
  if (error instanceof EvalError) return 'EvalError'
  if (error instanceof RangeError) return 'RangeError'
  if (error instanceof ReferenceError) return 'ReferenceError'
  if (error instanceof SyntaxError) return 'SyntaxError'
  if (error instanceof TypeError) return 'TypeError'
  if (error instanceof URIError) return 'URIError'
  return 'Error'
}
