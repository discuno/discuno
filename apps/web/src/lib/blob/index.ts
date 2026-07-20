import 'server-only'

import { del, get, type PutBlobResult } from '@vercel/blob'
import sharp from 'sharp'
import { env } from '~/env'
import {
  isImage,
  isImageBuffer,
  MAX_PROFILE_IMAGE_INPUT_BYTES,
  processBuffer,
  uploadBuffer,
} from '~/lib/blob/utils'
import { getSafeErrorName } from '~/lib/operational-logging'

const MAX_STORED_PROFILE_IMAGE_BYTES = 1024 * 1024
const STORED_PROFILE_IMAGE_READ_TIMEOUT_MS = 5_000
const PROVIDER_AVATAR_FETCH_TIMEOUT_MS = 5_000
const ALLOWED_PROVIDER_AVATAR_HOSTS = new Set(['lh3.googleusercontent.com'])
const ALLOWED_PROVIDER_AVATAR_CONTENT_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const isAllowedProviderAvatarUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      ALLOWED_PROVIDER_AVATAR_HOSTS.has(url.hostname)
    )
  } catch {
    return false
  }
}

const readStreamWithLimit = async (
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  declaredLength?: number
): Promise<Buffer> => {
  if (
    declaredLength !== undefined &&
    (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > maxBytes)
  ) {
    throw new Error('Profile image response is too large')
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new Error('Profile image response is too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, totalBytes)
}

const readResponseWithLimit = async (response: Response, maxBytes: number): Promise<Buffer> => {
  if (!response.body) throw new Error('Profile image response has no body')

  const contentLength = response.headers.get('content-length')
  return readStreamWithLimit(
    response.body,
    maxBytes,
    contentLength === null ? undefined : Number(contentLength)
  )
}

const decodeInlineProviderAvatar = (value: string): Buffer | null => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(value)
  if (!match?.[2]) return null

  const encoded = match[2].replace(/\s/g, '')
  if (encoded.length > Math.ceil(MAX_PROFILE_IMAGE_INPUT_BYTES / 3) * 4) {
    throw new Error('Inline profile image is too large')
  }

  const buffer = Buffer.from(encoded, 'base64')
  if (buffer.byteLength > MAX_PROFILE_IMAGE_INPUT_BYTES) {
    throw new Error('Inline profile image is too large')
  }
  return buffer
}

const getProviderAvatarBuffer = async (imageUrl: string): Promise<Buffer> => {
  if (imageUrl.startsWith('data:')) {
    const inlineBuffer = decodeInlineProviderAvatar(imageUrl)
    if (!inlineBuffer) throw new Error('Unsupported inline profile image')
    return inlineBuffer
  }

  if (!isAllowedProviderAvatarUrl(imageUrl)) {
    throw new Error('Profile image source is not allowed')
  }

  const response = await fetch(imageUrl, {
    cache: 'no-store',
    credentials: 'omit',
    headers: { Accept: 'image/webp,image/png,image/jpeg,image/gif' },
    redirect: 'manual',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(PROVIDER_AVATAR_FETCH_TIMEOUT_MS),
  })
  if (response.status >= 300 && response.status < 400) {
    throw new Error('Profile image redirects are not allowed')
  }
  if (!response.ok) throw new Error('Profile image request failed')

  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (!contentType || !ALLOWED_PROVIDER_AVATAR_CONTENT_TYPES.has(contentType)) {
    throw new Error('Profile image content type is invalid')
  }

  return readResponseWithLimit(response, MAX_PROFILE_IMAGE_INPUT_BYTES)
}

export const uploadProfileImage = async (file: File, userId: string): Promise<PutBlobResult> => {
  if (!(await isImage(file))) {
    throw new Error('File must be a valid image (PNG, GIF, or JPEG)')
  }

  // Convert file to buffer and process with Sharp
  const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
  const processedBuffer = await processBuffer(buffer)

  // Upload the processed buffer to Vercel Blob
  return await uploadBuffer(processedBuffer, userId)
}

/**
 * Delete a profile image from Vercel Blob
 * @param pathname - The pathname of the blob to delete
 */
export const isOwnedProfileImagePath = (pathname: string, userId: string): boolean =>
  pathname.startsWith(`profile-images/${userId}/`) && !pathname.includes('..')

export const validateProfileImageBlob = async (url: string, userId: string): Promise<void> => {
  const pathname = extractPathnameFromBlobUrl(url)
  if (!pathname || !isOwnedProfileImagePath(pathname, userId)) {
    throw new Error('Profile image does not belong to the authenticated user')
  }

  // Resolve the user-owned pathname through the authenticated Blob store. The
  // submitted URL is never used as a network destination, which prevents SSRF
  // and also binds the read to the store represented by our server token.
  const storedBlob = await get(pathname, {
    access: 'public',
    token: env.BLOB_READ_WRITE_TOKEN,
    useCache: false,
    abortSignal: AbortSignal.timeout(STORED_PROFILE_IMAGE_READ_TIMEOUT_MS),
  })
  if (
    !storedBlob ||
    storedBlob.statusCode !== 200 ||
    storedBlob.blob.pathname !== pathname ||
    !Number.isSafeInteger(storedBlob.blob.size) ||
    storedBlob.blob.size < 0 ||
    storedBlob.blob.size > MAX_STORED_PROFILE_IMAGE_BYTES ||
    storedBlob.blob.contentType !== 'image/webp'
  ) {
    throw new Error('Profile image metadata is invalid')
  }

  const buffer = await readStreamWithLimit(
    storedBlob.stream,
    MAX_STORED_PROFILE_IMAGE_BYTES,
    storedBlob.blob.size
  )
  if (buffer.length !== storedBlob.blob.size) {
    throw new Error('Profile image size is invalid')
  }

  const image = await sharp(buffer, { failOn: 'warning', limitInputPixels: 4096 * 4096 }).metadata()
  if (
    image.format !== 'webp' ||
    !image.width ||
    !image.height ||
    image.width > 4096 ||
    image.height > 4096
  ) {
    throw new Error('Profile image contents are invalid')
  }
}

export const deleteProfileImage = async (pathname: string, userId: string): Promise<void> => {
  if (!isOwnedProfileImagePath(pathname, userId)) {
    throw new Error('Cannot delete a profile image owned by another user')
  }
  try {
    await del(pathname, {
      token: env.BLOB_READ_WRITE_TOKEN,
    })
  } catch (error) {
    console.error('Profile image deletion failed', {
      errorName: getSafeErrorName(error),
    })
    // Don't throw here - if deletion fails, it's not critical for user experience
  }
}

/**
 * Extract blob pathname from a Vercel Blob URL
 * Used for organizing and managing blobs
 */
export const extractPathnameFromBlobUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    if (
      urlObj.protocol !== 'https:' ||
      urlObj.username !== '' ||
      urlObj.password !== '' ||
      urlObj.port !== '' ||
      !urlObj.hostname.endsWith('.blob.vercel-storage.com')
    ) {
      return null
    }
    // Vercel Blob URLs have the pathname after the domain
    return decodeURIComponent(urlObj.pathname.slice(1)) // Remove leading slash
  } catch {
    return null
  }
}

/**
 * Downloads an image from a URL, uploads it to Vercel Blob, and returns the new URL.
 * @param imageUrl - The URL of the image to download.
 * @param userId - The user's ID for organizing blobs.
 * @returns The new Blob URL, an allowlisted provider URL after a transient failure, or null.
 */
export const downloadAndUploadProfileImage = async (
  imageUrl: string,
  userId: string
): Promise<string | null> => {
  try {
    const buffer = await getProviderAvatarBuffer(imageUrl)
    if (!(await isImageBuffer(buffer))) throw new Error('Profile image contents are invalid')

    const processedBuffer = await processBuffer(buffer)
    const blobResult = await uploadBuffer(processedBuffer, userId)
    return blobResult.url
  } catch (error) {
    console.warn('OAuth profile image import skipped', {
      errorName: getSafeErrorName(error),
    })
    // Never persist an arbitrary URL or a failed inline payload from provider data.
    return isAllowedProviderAvatarUrl(imageUrl) ? imageUrl : null
  }
}
