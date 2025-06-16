import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../__tests__/test-utils'
import { StatusToast } from './StatusToast'
import { toast } from 'sonner'

// Mock sonner using factory function to avoid hoisting issues
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockToast = vi.mocked(toast)

describe('StatusToast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<StatusToast status={null} />)
      expect(container).toBeInTheDocument()
    })

    it('does not show toast when status is null', () => {
      renderWithProviders(<StatusToast status={null} />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('does not show toast when status is empty string', () => {
      renderWithProviders(<StatusToast status="" />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })
  })

  describe('Success Status Messages', () => {
    it('shows success toast for profile-updated status', () => {
      renderWithProviders(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledWith('Success', {
        description: 'Your profile has been successfully updated!',
      })
    })

    it('shows success toast for sent status', () => {
      renderWithProviders(<StatusToast status="sent" />)

      expect(mockToast.success).toHaveBeenCalledWith('Email Sent', {
        description:
          "We've sent you an email to verify your email address. Please check your inbox.",
      })
    })
  })

  describe('Error Status Messages', () => {
    it('shows error toast for invalid-input status', () => {
      renderWithProviders(<StatusToast status="invalid-input" />)

      expect(mockToast.error).toHaveBeenCalledWith('Invalid Input', {
        description: 'Please provide all the required information correctly.',
      })
    })

    it('shows error toast for error status', () => {
      renderWithProviders(<StatusToast status="error" />)

      expect(mockToast.error).toHaveBeenCalledWith('Error', {
        description: 'An unexpected error occurred. Please try again later.',
      })
    })

    it('shows error toast for not-found status', () => {
      renderWithProviders(<StatusToast status="not-found" />)

      expect(mockToast.error).toHaveBeenCalledWith('Not Found', {
        description: 'User profile not found.',
      })
    })

    it('shows error toast for invalid-image-type status', () => {
      renderWithProviders(<StatusToast status="invalid-image-type" />)

      expect(mockToast.error).toHaveBeenCalledWith('Invalid Image', {
        description: 'Invalid image type. Please upload a JPEG, PNG, or GIF.',
      })
    })

    it('shows error toast for image-too-large status', () => {
      renderWithProviders(<StatusToast status="image-too-large" />)

      expect(mockToast.error).toHaveBeenCalledWith('Image Too Large', {
        description: 'Image is too large. Maximum size is 5MB.',
      })
    })

    it('shows error toast for invalid-school-year status', () => {
      renderWithProviders(<StatusToast status="invalid-school-year" />)

      expect(mockToast.error).toHaveBeenCalledWith('Invalid School Year', {
        description: 'Selected school year is invalid.',
      })
    })

    it('shows error toast for invalid-graduation-year status', () => {
      renderWithProviders(<StatusToast status="invalid-graduation-year" />)

      expect(mockToast.error).toHaveBeenCalledWith('Invalid Graduation Year', {
        description: 'Graduation year must be the current year or a future year.',
      })
    })

    it('shows error toast for email-in-use status', () => {
      renderWithProviders(<StatusToast status="email-in-use" />)

      expect(mockToast.error).toHaveBeenCalledWith('Email Already in Use', {
        description: 'The email you entered is already in use. Please try a different one.',
      })
    })

    it('shows error toast for invalid-email status', () => {
      renderWithProviders(<StatusToast status="invalid-email" />)

      expect(mockToast.error).toHaveBeenCalledWith('Invalid Email', {
        description: 'Please enter a valid college email ending in .edu.',
      })
    })

    it('shows error toast for not-verified status', () => {
      renderWithProviders(<StatusToast status="not-verified" />)

      expect(mockToast.error).toHaveBeenCalledWith('Email Not Verified', {
        description:
          'Your email has not been verified. Please check your inbox for the verification link.',
      })
    })
  })

  describe('Unknown Status Handling', () => {
    it('does not show toast for unknown status', () => {
      renderWithProviders(<StatusToast status="unknown-status" />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('handles random string status gracefully', () => {
      renderWithProviders(<StatusToast status="random-string-123" />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })
  })

  describe('React Hooks Behavior', () => {
    it('shows toast only once when status changes', () => {
      const { rerender } = renderWithProviders(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledTimes(1)

      // Re-render with same status should not trigger toast again
      rerender(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledTimes(1)
    })

    it('shows new toast when status changes to different value', () => {
      const { rerender } = renderWithProviders(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledTimes(1)

      // Change to different status
      rerender(<StatusToast status="sent" />)

      expect(mockToast.success).toHaveBeenCalledTimes(2)
    })

    it('shows toast when status changes from null to valid status', () => {
      const { rerender } = renderWithProviders(<StatusToast status={null} />)

      expect(mockToast.success).not.toHaveBeenCalled()

      // Change to valid status
      rerender(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledTimes(1)
    })

    it('does not show toast when status changes from valid to null', () => {
      const { rerender } = renderWithProviders(<StatusToast status="profile-updated" />)

      expect(mockToast.success).toHaveBeenCalledTimes(1)

      // Change to null
      rerender(<StatusToast status={null} />)

      // Should still be 1, no new toast
      expect(mockToast.success).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined status', () => {
      renderWithProviders(<StatusToast status={undefined as any} />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('handles whitespace-only status', () => {
      renderWithProviders(<StatusToast status="   " />)

      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })
  })

  describe('Component Structure', () => {
    it('returns null and does not render anything in DOM', () => {
      const { container } = renderWithProviders(<StatusToast status="profile-updated" />)

      expect(container.firstChild).toBeNull()
    })
  })
})
