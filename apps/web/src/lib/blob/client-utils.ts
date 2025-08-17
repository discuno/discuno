'use client'

import imageCompression from 'browser-image-compression'

/**
 * Compress an image file using browser-image-compression
 * @param file - The image file to compress
 * @returns Promise with the compressed file, or original file if compression fails
 */
export const compressFile = async (file: File): Promise<File> => {
  const compressionOptions = {
    maxSizeMB: 1, // Compress to max 1MB for profile images
    maxWidthOrHeight: 1024, // Max dimension
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8, // Start with 80% quality
  }

  try {
    return await imageCompression(file, compressionOptions)
  } catch (error) {
    console.error('Error compressing image:', error)
    // Fall back to original file if compression fails
    return file
  }
}
