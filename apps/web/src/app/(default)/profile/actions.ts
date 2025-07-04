'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteProfileImage, uploadProfileImage } from '~/lib/blob'
import {
  getCurrentUserImage,
  getUserId,
  removeUserImage,
  updateCompleteUserProfile,
  updateUserImage,
} from '~/server/queries'

/**
 * Upload a new profile image for the current user
 */
export const uploadUserProfileImage = async (formData: FormData) => {
  const file = formData.get('image') as File
  if (file.size === 0) {
    throw new Error('No file provided')
  }

  // Get current user image to check for existing image
  const currentImageUrl = await getCurrentUserImage()

  // Upload new image to Vercel Blob (still need user ID for blob organization)
  // Get user ID from a separate query since we need it for blob storage
  const userId = await getUserId()
  const blob = await uploadProfileImage(file, userId)

  // Update user record with new image URL
  await updateUserImage(blob.url)

  // Delete old image if it exists and is a blob URL
  if (currentImageUrl?.includes('blob.vercel-storage.com')) {
    // Run deletion in background - don't block user experience
    deleteProfileImage(currentImageUrl).catch(error => {
      console.error('Failed to delete old profile image:', error)
    })
  }

  // Revalidate profile pages to show new image
  revalidatePath('/profile')
  revalidatePath('/profile/view')
  revalidatePath('/profile/edit')

  return { success: true, imageUrl: blob.url }
}

/**
 * Remove the current user's profile image
 */
export const removeUserProfileImage = async () => {
  // Get current user image
  const currentImageUrl = await getCurrentUserImage()

  // Update user record to remove image
  await removeUserImage()

  // Delete image from blob storage if it's a blob URL
  if (currentImageUrl?.includes('blob.vercel-storage.com')) {
    // Run deletion in background
    deleteProfileImage(currentImageUrl).catch(error => {
      console.error('Failed to delete profile image from blob storage:', error)
    })
  }

  // Revalidate profile pages
  revalidatePath('/profile')
  revalidatePath('/profile/view')
  revalidatePath('/profile/edit')

  return { success: true }
}

/**
 * Update user profile information with complete data handling
 */
export const updateUserProfile = async (formData: FormData) => {
  // Extract form data
  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const schoolYear = formData.get('schoolYear') as string
  const graduationYear = formData.get('graduationYear') as string
  const school = formData.get('school') as string
  const major = formData.get('major') as string

  // Prepare the update data, filtering out empty strings
  const updateData = {
    ...(name && name.trim() && { name: name.trim() }),
    bio: bio.trim() || null, // Allow clearing bio by setting to null
    ...(schoolYear &&
      schoolYear !== 'default' && {
        schoolYear: schoolYear as 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate',
      }),
    ...(graduationYear &&
      graduationYear !== 'default' && {
        graduationYear: parseInt(graduationYear, 10),
      }),
    ...(school && school !== 'default' && { school: school.trim() }),
    ...(major && major !== 'default' && { major: major.trim() }),
  }

  // Update complete user profile using the query function
  await updateCompleteUserProfile(updateData)

  // Revalidate profile pages
  revalidatePath('/profile')
  revalidatePath('/profile/view')
  revalidatePath('/profile/edit')

  redirect('/profile/edit?status=success')
}
