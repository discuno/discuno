import 'server-only'

import { type PutBlobResult, put } from '@vercel/blob'
import sharp from 'sharp'
import { env } from '~/env'
import { getSafeErrorName } from '~/lib/operational-logging'

export const MAX_PROFILE_IMAGE_INPUT_BYTES = 2 * 1024 * 1024
const MAX_PROFILE_IMAGE_DIMENSION = 4096
const MAX_PROFILE_IMAGE_PIXELS = MAX_PROFILE_IMAGE_DIMENSION * MAX_PROFILE_IMAGE_DIMENSION

const hasSupportedImageSignature = (buffer: Uint8Array): boolean => {
  if (buffer.byteLength < 12) return false

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  const isGif =
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50

  return isJpeg || isPng || isGif || isWebp
}

export const isImageBuffer = async (buffer: Buffer): Promise<boolean> => {
  if (buffer.byteLength > MAX_PROFILE_IMAGE_INPUT_BYTES || !hasSupportedImageSignature(buffer)) {
    return false
  }

  try {
    const metadata = await sharp(buffer, {
      failOn: 'warning',
      limitInputPixels: MAX_PROFILE_IMAGE_PIXELS,
    }).metadata()
    return (
      ['gif', 'jpeg', 'png', 'webp'].includes(metadata.format) &&
      metadata.width > 0 &&
      metadata.height > 0 &&
      metadata.width <= MAX_PROFILE_IMAGE_DIMENSION &&
      metadata.height <= MAX_PROFILE_IMAGE_DIMENSION
    )
  } catch {
    return false
  }
}

/**
 * Check if a file is a valid image by reading its magic bytes.
 * @param file - The file to validate
 * @returns A promise that resolves to true if the file is a valid image, false otherwise.
 */
export const isImage = async (file: File): Promise<boolean> => {
  if (file.size > MAX_PROFILE_IMAGE_INPUT_BYTES) return false
  return isImageBuffer(Buffer.from(await file.arrayBuffer()))
}

/**
 * Process a buffer by resizing and converting to WebP format using Sharp
 * @param buffer - The image buffer to process
 * @returns Promise with the processed buffer
 */
export const processBuffer = async (buffer: Buffer): Promise<Buffer> => {
  if (!(await isImageBuffer(buffer))) throw new Error('Image contents are invalid')

  const processedBuffer = await sharp(buffer, {
    failOn: 'warning',
    limitInputPixels: MAX_PROFILE_IMAGE_PIXELS,
  })
    .rotate()
    .resize(1024, 1024, { fit: 'inside' })
    .toFormat('webp', { quality: 80 })
    .toBuffer()

  // Validate file size (1MB limit for final processed image)
  const maxSize = 1 * 1024 * 1024 // 1MB
  if (processedBuffer.length > maxSize) {
    throw new Error('Processed image size must be less than 1MB')
  }

  return processedBuffer
}

/**
 * Upload a buffer to Vercel Blob storage
 * @param buffer - The processed image buffer to upload
 * @param userId - The user's ID for organizing blobs
 * @returns Promise with blob result containing URL and other metadata
 */
export const uploadBuffer = async (buffer: Buffer, userId: string): Promise<PutBlobResult> => {
  // Create a unique filename with timestamp to avoid conflicts
  const timestamp = Date.now()
  const pathname = `profile-images/${userId}/${timestamp}.webp`

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true, // Ensures uniqueness and prevents conflicts
    })

    return blob
  } catch (error) {
    console.error('Profile image upload failed', {
      errorName: getSafeErrorName(error),
    })
    throw new Error('Failed to upload profile image')
  }
}
