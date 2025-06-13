'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Toast } from '~/app/types'

interface StatusToastProps {
  status: string | null
}

export const StatusToast = ({ status }: StatusToastProps) => {
  useEffect(() => {
    if (!status) return

    const toastContent: Toast = {
      title: '',
      description: '',
      variant: 'success',
    }

    // Status param cases
    switch (status) {
      case 'invalid-input':
        toastContent.title = 'Invalid Input'
        toastContent.description = 'Please provide all the required information correctly.'
        toastContent.variant = 'error'
        break
      case 'error':
        toastContent.title = 'Error'
        toastContent.description = 'An unexpected error occurred. Please try again later.'
        toastContent.variant = 'error'
        break
      case 'profile-updated':
        toastContent.title = 'Success'
        toastContent.description = 'Your profile has been successfully updated!'
        break
      case 'not-found':
        toastContent.title = 'Not Found'
        toastContent.description = 'User profile not found.'
        toastContent.variant = 'error'
        break
      case 'invalid-image-type':
        toastContent.title = 'Invalid Image'
        toastContent.description = 'Invalid image type. Please upload a JPEG, PNG, or GIF.'
        toastContent.variant = 'error'
        break
      case 'image-too-large':
        toastContent.title = 'Image Too Large'
        toastContent.description = 'Image is too large. Maximum size is 5MB.'
        toastContent.variant = 'error'
        break
      case 'invalid-school-year':
        toastContent.title = 'Invalid School Year'
        toastContent.description = 'Selected school year is invalid.'
        toastContent.variant = 'error'
        break
      case 'invalid-graduation-year':
        toastContent.title = 'Invalid Graduation Year'
        toastContent.description = 'Graduation year must be the current year or a future year.'
        toastContent.variant = 'error'
        break
      case 'email-in-use':
        toastContent.title = 'Email Already in Use'
        toastContent.description = 'The email you entered is already in use. Please try a different one.'
        toastContent.variant = 'error'
        break
      case 'invalid-email':
        toastContent.title = 'Invalid Email'
        toastContent.description = 'Please enter a valid college email ending in .edu.'
        toastContent.variant = 'error'
        break
      case 'sent':
        toastContent.title = 'Email Sent'
        toastContent.description = "We've sent you an email to verify your email address. Please check your inbox."
        break
      case 'not-verified':
        toastContent.title = 'Email Not Verified'
        toastContent.description =
          'Your email has not been verified. Please check your inbox for the verification link.'
        toastContent.variant = 'error'
        break
      default:
        // Don't show toast for unknown statuses
        return
    }

    // Only show toast if we have a title
    if (toastContent.title) {
      toast[toastContent.variant](toastContent.title, {
        description: toastContent.description,
      })
    }
  }, [status])

  return null
}
