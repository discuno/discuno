import 'server-only'

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large')
    this.name = 'RequestBodyTooLargeError'
  }
}

/** Read a UTF-8 request body without allowing an unbounded serverless allocation. */
export const readBoundedUtf8Body = async (
  request: Request,
  maximumBytes: number
): Promise<string> => {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyTooLargeError()
  }
  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > maximumBytes) {
        await reader.cancel()
        throw new RequestBodyTooLargeError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(body)
}
