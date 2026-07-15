'use server'
import 'server-only'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import {
  deleteProfileImage,
  extractPathnameFromBlobUrl,
  validateProfileImageBlob,
} from '~/lib/blob'
import { getSafeErrorName } from '~/lib/operational-logging'
import {
  completeUserProfile,
  getUserImageUrl,
  removeProfileImage,
  setUserTimezone,
  updateProfileImage,
} from '~/lib/services/profile-service'
import { getUserId } from '~/server/queries/profiles'

const scheduleProfileImageDeletion = (pathname: string, userId: string): void => {
  after(
    deleteProfileImage(pathname, userId).catch(error => {
      console.error('Deferred profile image deletion failed', {
        errorName: getSafeErrorName(error),
      })
    })
  )
}

export const updateUserProfileImage = async (imageUrl: string) => {
  const userId = await getUserId()
  try {
    await validateProfileImageBlob(imageUrl, userId)
  } catch (error) {
    const rejectedPathname = extractPathnameFromBlobUrl(imageUrl)
    if (rejectedPathname) {
      await deleteProfileImage(rejectedPathname, userId).catch(() => undefined)
    }
    throw error
  }

  // Get current user image to check for existing image
  const currentImageUrl = await getUserImageUrl()

  // Update user record with new image URL
  await updateProfileImage(imageUrl)

  // Delete old image if it exists and is a blob URL
  if (currentImageUrl !== imageUrl && currentImageUrl?.includes('blob.vercel-storage.com')) {
    const pathname = extractPathnameFromBlobUrl(currentImageUrl)
    if (pathname) {
      scheduleProfileImageDeletion(pathname, userId)
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
  const userId = await getUserId()
  // Get current user image
  const currentImageUrl = await getUserImageUrl()

  // Update user record to remove image
  await removeProfileImage()

  // Delete image from blob storage if it's a blob URL
  if (currentImageUrl?.includes('blob.vercel-storage.com')) {
    const pathname = extractPathnameFromBlobUrl(currentImageUrl)
    if (pathname) {
      scheduleProfileImageDeletion(pathname, userId)
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
    // Update complete user profile using the service function
    await completeUserProfile(updateData)

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
  await setUserTimezone(timezone)
}
