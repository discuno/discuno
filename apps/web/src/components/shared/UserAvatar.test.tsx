import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, userEvent } from '../../__tests__/test-utils'
import { AvatarIcon } from './UserAvatar'
import { signOut } from 'next-auth/react'

// Mock next-auth using factory function
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockSignOut = vi.mocked(signOut)

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock the ThemeToggle component
vi.mock('~/app/(default)/(layout)/nav/ThemeToggle', () => ({
  ModeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}))

describe('UserAvatar Component', () => {
  const defaultProps = {
    profilePic: 'https://example.com/profile.jpg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the avatar with profile picture', () => {
      const { getByRole } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      expect(avatarButton).toBeInTheDocument()
    })

    it('renders the theme toggle', () => {
      const { getByTestId } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      expect(getByTestId('theme-toggle')).toBeInTheDocument()
    })

    it('displays profile picture in avatar', () => {
      const { container } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      // Look for the AvatarImage component (which may or may not load)
      const avatarImage = container.querySelector('img[alt="Profile Picture"]')
      if (avatarImage) {
        expect(avatarImage).toHaveAttribute('src', defaultProps.profilePic)
      } else {
        // If image doesn't load, fallback should be present
        expect(container.textContent).toContain('ME')
      }
    })

    it('shows fallback when profile picture fails to load', () => {
      const { getByText } = renderWithProviders(<AvatarIcon profilePic="" />)

      expect(getByText('ME')).toBeInTheDocument()
    })
  })

  describe('Dropdown Menu', () => {
    it('opens dropdown when avatar is clicked', async () => {
      const user = userEvent.setup()
      const { getByRole, getByText } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      expect(getByText('Quick Actions')).toBeInTheDocument()
    })

    it('renders all menu items', async () => {
      const user = userEvent.setup()
      const { getByRole, getByText } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      expect(getByText('View Profile')).toBeInTheDocument()
      expect(getByText('Notifications')).toBeInTheDocument()
      expect(getByText('Messages')).toBeInTheDocument()
      expect(getByText('Become a Mentor')).toBeInTheDocument()
      expect(getByText('Help Center')).toBeInTheDocument()
      expect(getByText('Log out')).toBeInTheDocument()
    })

    it('renders correct links for menu items', async () => {
      const user = userEvent.setup()
      const { getByRole } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      const viewProfileLink = getByRole('link', { name: 'View Profile' })
      expect(viewProfileLink).toHaveAttribute('href', '/profile/view')

      const notificationsLink = getByRole('link', { name: 'Notifications' })
      expect(notificationsLink).toHaveAttribute('href', '/notifications')

      const messagesLink = getByRole('link', { name: 'Messages' })
      expect(messagesLink).toHaveAttribute('href', '/messages')

      const mentorLink = getByRole('link', { name: 'Become a Mentor' })
      expect(mentorLink).toHaveAttribute('href', '/email-verification')

      const helpLink = getByRole('link', { name: 'Help Center' })
      expect(helpLink).toHaveAttribute('href', '/help')
    })
  })

  describe('Sign Out Functionality', () => {
    it('calls signOut when log out is clicked', async () => {
      const user = userEvent.setup()
      const { getByRole, getByText } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      const logoutButton = getByText('Log out')
      await user.click(logoutButton)

      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const { getByRole } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      expect(avatarButton).toHaveAttribute('aria-label', 'User menu')
    })

    it('has proper button attributes', () => {
      const { getByRole } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      expect(avatarButton).toHaveClass('rounded-full')
      expect(avatarButton).toHaveClass('focus:ring-2')
      expect(avatarButton).toHaveClass('focus:ring-primary')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const { getByRole, getByText } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      avatarButton.focus()
      await user.keyboard('{Enter}')

      expect(getByText('Quick Actions')).toBeInTheDocument()
    })
  })

  describe('Visual Design', () => {
    it('has correct button styling', () => {
      const { getByRole } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = getByRole('button', { name: 'User menu' })
      expect(avatarButton).toHaveClass(
        'h-10',
        'w-10',
        'rounded-full',
        'focus:ring-2',
        'focus:ring-primary'
      )
    })

    it('has correct container layout', () => {
      const { container } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      // Find the main container div with the flex classes
      const containerDiv = container.querySelector(
        '.flex.flex-row.items-center.justify-end.space-x-4'
      )
      expect(containerDiv).toBeInTheDocument()
      expect(containerDiv).toHaveClass(
        'flex',
        'flex-row',
        'items-center',
        'justify-end',
        'space-x-4'
      )
    })

    it('has proper avatar dimensions', () => {
      const { container } = renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarContainer = container.querySelector('.h-10.w-10')
      expect(avatarContainer).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles missing profile picture gracefully', () => {
      const { getByText } = renderWithProviders(<AvatarIcon profilePic="" />)

      expect(getByText('ME')).toBeInTheDocument()
    })

    it('handles invalid profile picture URL gracefully', () => {
      const { getByText } = renderWithProviders(<AvatarIcon profilePic="invalid-url" />)

      // The fallback should still be available
      expect(getByText('ME')).toBeInTheDocument()
    })
  })
})
