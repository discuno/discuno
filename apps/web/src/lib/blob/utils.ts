import 'server-only'

import { type PutBlobResult, put } from '@vercel/blob'
import sharp from 'sharp'
import { env } from '~/env'

const IMAGE_SIGNATURES = {
  '89504e47': 'image/png',
  '47494638': 'image/gif',
  ffd8ffdb: 'image/jpeg',
  ffd8ffe0: 'image/jpeg',
  ffd8ffe1: 'image/jpeg',
  ffd8ffe2: 'image/jpeg',
  ffd8ffe3: 'image/jpeg',
  ffd8ffe8: 'image/jpeg',
} as const

/**
 * Check if a file is a valid image by reading its magic bytes.
 * @param file - The file to validate
 * @returns A promise that resolves to true if the file is a valid image, false otherwise.
 */
export const isImage = async (file: File): Promise<boolean> => {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const signature = view.getUint32(0).toString(16)
  return Object.hasOwn(IMAGE_SIGNATURES, signature)
}

/**
 * Process a buffer by resizing and converting to WebP format using Sharp
 * @param buffer - The image buffer to process
 * @returns Promise with the processed buffer
 */
export const processBuffer = async (buffer: Buffer): Promise<Buffer> => {
  const processedBuffer = await sharp(buffer)
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
    console.error('Error uploading profile image:', error)
    throw new Error('Failed to upload profile image')
  }
}
