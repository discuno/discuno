import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../__tests__/test-utils'
import { LoadingSpinner } from './LoadingSpinner'

describe('LoadingSpinner Component', () => {
  describe('Basic Rendering', () => {
    it('renders the loading spinner with default props', () => {
      const { getByRole } = renderWithProviders(<LoadingSpinner />)

      expect(getByRole('status')).toBeInTheDocument()
    })

    it('displays default loading text', () => {
      const { getByText } = renderWithProviders(<LoadingSpinner />)

      expect(getByText('Loading...')).toBeInTheDocument()
    })

    it('renders spinner element', () => {
      const { container } = renderWithProviders(<LoadingSpinner />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders small size correctly', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="sm" />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('h-4', 'w-4')
      expect(container.firstChild).toHaveClass('text-sm')
    })

    it('renders default size correctly', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="default" />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('h-6', 'w-6')
      expect(container.firstChild).toHaveClass('text-base')
    })

    it('renders large size correctly', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="lg" />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('h-8', 'w-8')
      expect(container.firstChild).toHaveClass('text-lg')
    })

    it('handles custom spinner size', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="sm" spinnerSize="lg" />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('h-8', 'w-8') // Large spinner
      expect(container.firstChild).toHaveClass('text-sm') // Small text
    })
  })

  describe('Alignment', () => {
    it('renders with left alignment', () => {
      const { container } = renderWithProviders(<LoadingSpinner align="left" />)

      expect(container.firstChild).toHaveClass('justify-start')
    })

    it('renders with center alignment by default', () => {
      const { container } = renderWithProviders(<LoadingSpinner />)

      expect(container.firstChild).toHaveClass('justify-center')
    })

    it('renders with right alignment', () => {
      const { container } = renderWithProviders(<LoadingSpinner align="right" />)

      expect(container.firstChild).toHaveClass('justify-end')
    })
  })

  describe('Text Customization', () => {
    it('displays custom text', () => {
      const { getByText } = renderWithProviders(<LoadingSpinner text="Please wait..." />)

      expect(getByText('Please wait...')).toBeInTheDocument()
    })

    it('hides text when showText is false', () => {
      const { queryByText } = renderWithProviders(<LoadingSpinner showText={false} />)

      expect(queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('sets aria-label when text is hidden', () => {
      const { getByRole } = renderWithProviders(<LoadingSpinner showText={false} text="Custom loading" />)

      const spinner = getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Custom loading')
    })

    it('does not set aria-label when text is visible', () => {
      const { getByRole } = renderWithProviders(<LoadingSpinner showText={true} />)

      const spinner = getByRole('status')
      expect(spinner).not.toHaveAttribute('aria-label')
    })
  })

  describe('Design System Integration', () => {
    it('uses design system colors', () => {
      const { container } = renderWithProviders(<LoadingSpinner />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('border-muted', 'border-t-primary')

      const textSpan = container.querySelector('span')
      expect(textSpan).toHaveClass('text-muted-foreground')
    })

    it('has proper base spinner classes', () => {
      const { container } = renderWithProviders(<LoadingSpinner />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveClass('animate-spin', 'rounded-full', 'border-2')
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      const { getByRole } = renderWithProviders(<LoadingSpinner />)

      const spinner = getByRole('status')
      expect(spinner).toHaveAttribute('aria-live', 'polite')
    })

    it('marks spinner as decorative', () => {
      const { container } = renderWithProviders(<LoadingSpinner />)

      const spinnerDiv = container.querySelector('.animate-spin')
      expect(spinnerDiv).toHaveAttribute('aria-hidden', 'true')
    })

    it('supports custom className', () => {
      const { container } = renderWithProviders(<LoadingSpinner className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      renderWithProviders(<LoadingSpinner ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})
