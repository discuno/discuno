import { del, put, type PutBlobResult } from '@vercel/blob'
import { env } from '~/env'

/**
 * Upload a profile image to Vercel Blob
 * @param file - The image file to upload
 * @param userId - The user's ID for organizing blobs
 * @returns Promise with blob result containing URL and other metadata
 */
export const uploadProfileImage = async (file: File, userId: string): Promise<PutBlobResult> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB')
  }

  // Create a unique filename with timestamp to avoid conflicts
  const timestamp = Date.now()
  const fileExtension = file.name.split('.').pop() ?? 'jpg'
  const pathname = `profile-images/${userId}/${timestamp}.${fileExtension}`

  try {
    const blob = await put(pathname, file, {
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

/**
 * Delete a profile image from Vercel Blob
 * @param url - The full blob URL to delete
 */
export const deleteProfileImage = async (url: string): Promise<void> => {
  try {
    await del(url, {
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
 * Get a download URL that forces download instead of inline display
 * Useful for backup/export functionality
 */
export const getDownloadUrl = (blobUrl: string): string => {
  try {
    const url = new URL(blobUrl)
    url.searchParams.set('download', '1')
    return url.toString()
  } catch {
    return blobUrl
  }
}
