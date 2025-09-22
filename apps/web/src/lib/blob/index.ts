import 'server-only'

import { del, type PutBlobResult } from '@vercel/blob'
import { env } from '~/env'
import { isImage, processBuffer, uploadBuffer } from '~/lib/blob/utils'

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
export const deleteProfileImage = async (pathname: string): Promise<void> => {
  try {
    await del(pathname, {
      token: env.BLOB_READ_WRITE_TOKEN,
    })
  } catch (error) {
    console.error('Error deleting profile image:', error)
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
    // Vercel Blob URLs have the pathname after the domain
    return urlObj.pathname.slice(1) // Remove leading slash
  } catch {
    return null
  }
}

/**
 * Downloads an image from a URL, uploads it to Vercel Blob, and returns the new URL.
 * @param imageUrl - The URL of the image to download.
 * @param userId - The user's ID for organizing blobs.
 * @returns Promise with the new blob URL, or the original URL if the process fails.
 */
export const downloadAndUploadProfileImage = async (
  imageUrl: string,
  userId: string
): Promise<string> => {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`)
      return imageUrl // Return original URL on fetch failure
    }

    const blob = await response.blob()

    // Validate that the fetched content is an image
    const file = new File([blob], 'profile-image', { type: blob.type })
    if (!(await isImage(file))) {
      console.error('Downloaded file is not a valid image.')
      return imageUrl
    }

    const blobResult = await uploadProfileImage(file, userId)
    return blobResult.url
  } catch (error) {
    console.error('Error downloading or uploading profile image:', error)
    return imageUrl // Fallback to original URL
  }
}
