'use server'
import 'server-only'

import { revalidatePath } from 'next/cache'
import { deleteProfileImage, extractPathnameFromBlobUrl } from '~/lib/blob'
import {
  getCurrentUserImage,
  getOrCreateUserTimezone,
  removeUserImage,
  updateCompleteProfile,
  updateUserImage,
} from '~/server/queries'

export const updateUserProfileImage = async (imageUrl: string) => {
  // Get current user image to check for existing image
  const currentImageUrl = await getCurrentUserImage()

  // Update user record with new image URL
  await updateUserImage(imageUrl)

  // Delete old image if it exists and is a blob URL
  if (currentImageUrl?.includes('blob.vercel-storage.com')) {
    const pathname = extractPathnameFromBlobUrl(currentImageUrl)
    if (pathname) {
      // Run deletion in background - don't block user experience
      deleteProfileImage(pathname).catch(error => {
        console.error('Failed to delete old profile image:', error)
      })
    }
  }

  // Revalidate profile pages to show new image
  revalidatePath('/profile')
  revalidatePath('/profile/view')
  revalidatePath('/profile/edit')

  return { success: true, imageUrl }
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
    const pathname = extractPathnameFromBlobUrl(currentImageUrl)
    if (pathname) {
      // Run deletion in background
      deleteProfileImage(pathname).catch(error => {
        console.error('Failed to delete profile image from blob storage:', error)
      })
    }
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

  try {
    // Update complete user profile using the query function
    await updateCompleteProfile(updateData)

    // Revalidate profile pages
    revalidatePath('/profile')
    revalidatePath('/profile/edit')

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return { success: false, message: errorMessage }
  }
}

export const getOrCreateUserTimezoneAction = async (timezone: string) => {
  await getOrCreateUserTimezone(timezone)
}
