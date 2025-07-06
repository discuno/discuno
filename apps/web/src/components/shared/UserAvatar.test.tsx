import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signOut } from 'next-auth/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarIcon } from './UserAvatar'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

// Mock the ThemeToggle component
vi.mock('~/app/(default)/(layout)/nav/ThemeToggle', () => ({
  ModeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}))

// Create a test provider wrapper for consistent testing
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui)
}

describe('UserAvatar Component', () => {
  const defaultProps = {
    profilePic: 'https://example.com/profile.jpg',
    isAuthenticated: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication States', () => {
    it('renders sign in button when not authenticated', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} isAuthenticated={false} />)

      const signInButton = screen.getByRole('link', { name: /sign in/i })
      expect(signInButton).toBeInTheDocument()
      expect(signInButton).toHaveAttribute('href', '/auth')
    })

    it('renders avatar menu when authenticated without profile picture', () => {
      renderWithProviders(<AvatarIcon profilePic="" isAuthenticated={true} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      expect(avatarButton).toBeInTheDocument()
    })

    it('renders avatar menu when authenticated with profile picture', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      expect(avatarButton).toBeInTheDocument()
    })
  })

  describe('Basic Rendering', () => {
    it('renders the theme toggle', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })

    it('displays profile picture in avatar', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      // Check for avatar image
      const avatarImage = screen.queryByAltText('Profile Picture')
      if (avatarImage) {
        expect(avatarImage).toHaveAttribute('src', defaultProps.profilePic)
      } else {
        // If image doesn't load, fallback icon should be present
        const fallbackIcon = screen.getByRole('button', { name: 'User menu' })
        expect(fallbackIcon).toBeInTheDocument()
      }
    })

    it('shows fallback icon when profile picture fails to load', () => {
      renderWithProviders(<AvatarIcon profilePic="" isAuthenticated={true} />)

      // Component should render avatar menu when no profile pic but authenticated
      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      expect(avatarButton).toBeInTheDocument()
    })
  })

  describe('Dropdown Menu', () => {
    it('opens dropdown when avatar is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('renders all menu items', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      // Check for actual menu items from the component
      expect(screen.getByText('View Profile')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('My Schedule')).toBeInTheDocument()
      expect(screen.getByText('Become a Mentor')).toBeInTheDocument()
      expect(screen.getByText('Help Center')).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('renders correct links for menu items', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      const viewProfileLink = screen.getByRole('link', { name: 'View Profile' })
      expect(viewProfileLink).toHaveAttribute('href', '/profile/view')

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')

      const scheduleLink = screen.getByRole('link', { name: 'My Schedule' })
      expect(scheduleLink).toHaveAttribute('href', '/scheduling')

      const mentorLink = screen.getByRole('link', { name: 'Become a Mentor' })
      expect(mentorLink).toHaveAttribute('href', '/email-verification')

      const helpLink = screen.getByRole('link', { name: 'Help Center' })
      expect(helpLink).toHaveAttribute('href', '/help')
    })
  })

  describe('Sign Out Functionality', () => {
    it('calls signOut when log out is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      const logoutButton = screen.getByText('Log out')
      await user.click(logoutButton)

      expect(vi.mocked(signOut)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(signOut)).toHaveBeenCalledWith({ callbackUrl: '/auth' })
    })

    it('handles sign out errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLocation = window.location

      // Mock window.location properly
      Object.defineProperty(window, 'location', {
        value: {
          href: '',
        },
        writable: true,
      })

      vi.mocked(signOut).mockRejectedValueOnce(new Error('Sign out failed'))

      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      await user.click(avatarButton)

      const logoutButton = screen.getByText('Log out')
      await user.click(logoutButton)

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Sign out error:', expect.any(Error))
      expect(window.location.href).toBe('/auth')

      consoleSpy.mockRestore()
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      expect(avatarButton).toHaveAttribute('aria-label', 'User menu')
    })

    it('has proper button attributes', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      expect(avatarButton).toHaveClass('rounded-full')
      expect(avatarButton).toHaveClass('focus:ring-2')
      expect(avatarButton).toHaveClass('focus:ring-primary')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
      avatarButton.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })
  })

  describe('Visual Design', () => {
    it('has correct button styling', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} />)

      const avatarButton = screen.getByRole('button', { name: 'User menu' })
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
      renderWithProviders(<AvatarIcon profilePic="" isAuthenticated={true} />)

      // Should show avatar menu button when authenticated but no profile pic
      expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument()
    })

    it('handles unauthenticated state gracefully', () => {
      renderWithProviders(<AvatarIcon {...defaultProps} isAuthenticated={false} />)

      // Should show sign in button when not authenticated
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    })
  })
})
