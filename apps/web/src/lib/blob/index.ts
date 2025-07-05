import { del, put, type PutBlobResult } from '@vercel/blob'
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
const isImage = async (file: File): Promise<boolean> => {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const signature = view.getUint32(0).toString(16)
  return Object.hasOwn(IMAGE_SIGNATURES, signature)
}

/**
 * Upload a profile image to Vercel Blob
 * @param file - The image file to upload
 * @param userId - The user's ID for organizing blobs
 * @returns Promise with blob result containing URL and other metadata
 */
export const uploadProfileImage = async (file: File, userId: string): Promise<PutBlobResult> => {
  // Validate file type by checking magic bytes
  if (!(await isImage(file))) {
    throw new Error('File must be a valid image (PNG, GIF, or JPEG)')
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
