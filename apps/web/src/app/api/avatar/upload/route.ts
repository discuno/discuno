import { del } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { env } from '~/env'
import { validateProfileImageBlob } from '~/lib/blob'
import { getSafeErrorName } from '~/lib/operational-logging'
import { getUserId } from '~/server/queries/profiles'

const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024
const MAX_AVATAR_REQUEST_BYTES = 64 * 1024

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isHandleUploadBody = (value: unknown): value is HandleUploadBody =>
  isRecord(value) &&
  isRecord(value.payload) &&
  (value.type === 'blob.generate-client-token' || value.type === 'blob.upload-completed')

const readRequestJsonWithLimit = async (request: Request): Promise<unknown> => {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    const contentLength = Number(declaredLength)
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_AVATAR_REQUEST_BYTES
    ) {
      throw new Error('Invalid avatar upload request size')
    }
  }

  if (!request.body) throw new Error('Missing avatar upload request body')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > MAX_AVATAR_REQUEST_BYTES) {
        await reader.cancel()
        throw new Error('Avatar upload request body is too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readRequestJsonWithLimit(request)
    if (!isHandleUploadBody(body)) throw new Error('Invalid avatar upload request body')

    const jsonResponse = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async pathname => {
        const userId = await getUserId()
        const expectedPathname = `profile-images/${userId}/avatar.webp`
        if (pathname !== expectedPathname) throw new Error('Invalid profile image path')

        return {
          allowedContentTypes: ['image/webp'],
          maximumSizeInBytes: MAX_PROFILE_IMAGE_BYTES,
          validUntil: Date.now() + 5 * 60 * 1000,
          tokenPayload: JSON.stringify({
            userId,
          }),
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let userId: string | null = null
        try {
          const payload = JSON.parse(tokenPayload ?? '') as { userId?: unknown }
          userId = typeof payload.userId === 'string' ? payload.userId : null
        } catch {
          // Invalid completion callbacks are cleaned up below.
        }

        try {
          if (!userId) throw new Error('Invalid avatar upload token payload')
          await validateProfileImageBlob(blob.url, userId)
        } catch {
          try {
            await del(blob.url, { token: env.BLOB_READ_WRITE_TOKEN })
          } catch (deleteError) {
            console.error('Invalid profile image cleanup failed', {
              errorName: getSafeErrorName(deleteError),
            })
          }
          console.warn('Removed a profile image that failed upload validation')
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.warn('Avatar upload request rejected', {
      errorName: getSafeErrorName(error),
    })
    return NextResponse.json({ error: 'Invalid avatar upload request' }, { status: 400 })
  }
}
