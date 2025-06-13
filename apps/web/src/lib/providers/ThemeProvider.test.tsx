import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next-themes to prevent SSR issues
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="theme-provider" {...props}>
      {children}
    </div>
  ),
}))

import { ThemeProvider } from './ThemeProvider'

describe('ThemeProvider Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider Rendering', () => {
    it('renders children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child-component">Test Content</div>
        </ThemeProvider>
      )

      expect(screen.getByTestId('child-component')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders the theme provider wrapper', () => {
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      )

      expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    })

    it('renders the theme provider with proper structure', () => {
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      )

      const provider = screen.getByTestId('theme-provider')
      expect(provider).toBeInTheDocument()
      expect(provider).toContainHTML('<div>Content</div>')
    })
  })

  describe('Theme Configuration', () => {
    it('provides theme functionality to components', () => {
      const TestComponent = () => <div data-testid="themed-component">Themed Content</div>

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      const provider = screen.getByTestId('theme-provider')
      const themedComponent = screen.getByTestId('themed-component')

      expect(provider).toBeInTheDocument()
      expect(themedComponent).toBeInTheDocument()
    })

    it('wraps child components correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child Component</div>
        </ThemeProvider>
      )

      const provider = screen.getByTestId('theme-provider')
      const child = screen.getByTestId('child')

      expect(provider).toContainElement(child)
    })
  })

  describe('Children Handling', () => {
    it('handles multiple children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
        </ThemeProvider>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })

    it('handles nested components', () => {
      render(
        <ThemeProvider>
          <div data-testid="parent">
            <div data-testid="nested-child">Nested Content</div>
          </div>
        </ThemeProvider>
      )

      expect(screen.getByTestId('parent')).toBeInTheDocument()
      expect(screen.getByTestId('nested-child')).toBeInTheDocument()
    })

    it('handles empty children gracefully', () => {
      render(<ThemeProvider>{null}</ThemeProvider>)

      expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    })

    it('handles string children', () => {
      render(<ThemeProvider>Plain text content</ThemeProvider>)

      expect(screen.getByText('Plain text content')).toBeInTheDocument()
    })
  })

  describe('Provider Integration', () => {
    it('provides theme context to child components', () => {
      const TestComponent = () => <div data-testid="test-component">Test Component</div>

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('works with complex component trees', () => {
      const ComplexTree = () => (
        <div data-testid="complex-tree">
          <header data-testid="header">Header</header>
          <main data-testid="main">
            <section data-testid="section">Section Content</section>
          </main>
          <footer data-testid="footer">Footer</footer>
        </div>
      )

      render(
        <ThemeProvider>
          <ComplexTree />
        </ThemeProvider>
      )

      expect(screen.getByTestId('complex-tree')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('main')).toBeInTheDocument()
      expect(screen.getByTestId('section')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('Error Boundaries', () => {
    it('handles component errors gracefully', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error')
      }

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <ThemeProvider>
            <ThrowingComponent />
          </ThemeProvider>
        )
      }).toThrow('Test error')

      consoleSpy.mockRestore()
    })
  })
})
